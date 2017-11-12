import {Transform} from "./Transform";
import {IGateway} from "./Gateway";
import {IModel, IModelClass} from "./Model";
import {Observable} from "ii-observable";
import {JSql, Order} from "ii-jsql";
import {IState} from "./State";
import * as _ from "lodash";

export interface IFilter {
    property: string;
    value: string | number;
}

export class Store<M extends IModel<T>, T> extends Observable {
    protected model: IModelClass<T>;

    private records: M[] = [];

    private removed: M[] = [];

    private created: M[] = [];

    private updated: M[] = [];

    private filters: IFilter[] = [];

    private sort: Order;

    private lastOptions: {[key: string]: any};

    /**
     * Holds the number of the current loaded page.
     */
    private page: number;

    private state: IState;

    private baseParams: {[key: string]: any};

    constructor(private gateway: IGateway) {
        super();
    }

    protected initEvents() {
        return [
            'datachange',
            'add',
            'remove',
            'update',
            'save'
        ];
    }

    public setState(state: IState) {
        this.state = state;
        this.readState();
    }

    private readState() {
        const state = this.state;

        const rawCreate: {[key: string]: any} = state.get('create');
        if (rawCreate) {
            this.created = rawCreate.map(data => new this.model(Transform.data(data, this.model.fields), true));
        }

        const rawUpdate: {[key: string]: any} = state.get('update');
        if (rawUpdate) {
            this.updated = <M[]> rawUpdate.map(data => new this.model(Transform.data(data, this.model.fields), false));
        }

        const rawDelete: {[key: string]: any}[] = state.get('delete');
        if (rawDelete) {
            this.removed = <M[]> rawDelete.map(data => new this.model(Transform.data(data, this.model.fields), false));
        }

        state.removeMany(['create', 'update', 'delete']);
        this.writeState();
    }

    private writeState() {
        const state = this.state;

        state.set('create', this.created.map(record => record.getData()));
        state.set('update', this.updated.map(record => record.getData()));
        state.set('delete', this.removed.map(record => record.getData()));
    }

    public setBaseParams(params: {[key: string]: any}) {
        this.baseParams = params;
    }

    public setFilters(filters: IFilter[]) {
        this.filters = filters;
    }

    public getFilters(): IFilter[] {
        return this.filters;
    }

    public setSort(sort: Order) {
        this.sort = sort;
    }

    public getSort(): Order {
        return this.sort;
    }

    loadData(data) {
        const removed = this.removed.map(record => this.model.getId(record.getData()));
        const updated = {};
        this.updated.forEach(record => updated[this.model.getId(record.getData())] = record);

        this.records = data.map(itemData => {
                const newData = Transform.data(itemData, this.model.fields);
                const id = this.model.getId(newData);

                if (removed.indexOf(id) > -1) {
                    return null;
                }

                return updated[id] || new this.model(itemData, false);
            })
            .filter(record => record !== null);

        if (this.created) {
            this.created.forEach(
                record => {
                    const index = this.calculateInsertIndex(record);

                    if (index > -1) {
                        this.records.splice(index, 0, record);
                    }
                }
            );
        }

        const records = this.getRecords();
        this.fireEvent('datachange', records);

        return records;
    }

    /**
     * By default, only insert created records on the new first page.
     * @param {IModel<T>} record
     * @returns {number}
     */
    protected calculateInsertIndex(record: IModel<T>): number {
        return this.page === 1 ? 0 : -1;
    }

    getRecords(): M[] {
        return [].concat(this.records);
    }

    load(options): Promise<M[]> {
        this.page = options.page || 1;

        const payload: {[key: string]: any} = {
            page: options.page,
        };

        if (this.baseParams) {
            payload.params = _.assign({}, this.baseParams);
        }

        if (options.params) {
            payload.params = _.assign(payload.params || {}, options.params);
        }

        if (options.limit) {
            payload.limit = options.limit;
        }

        if (this.filters.length > 0) {
            payload.filters = this.filters;
        }

        const sort = this.getSort();
        if (sort) {
            payload.sort = sort;
        }

        this.lastOptions = options;

        return this.gateway
            .read(payload)
            .then(this.loadData.bind(this));
    }

    add(records: M[]) {
        this.insert(this.records.length, records);
    }

    insert(index: number = 0, records: M[]) {
        Array.prototype.splice.apply(this.records, (<any[]> [index, 0]).concat(records));
        this.created = this.created.concat(records);
        this.fireEvent('add', records);
    }

    remove(records: M[]) {
        this.records = this.records.filter(record => records.indexOf(record) === -1);
        this.removed = this.removed.concat(records);
        this.fireEvent('remove', records);
    }

    save() {
        const me = this;
        const created = this.created;
        const create = {};
        const update = {};
        const del = this.removed.map(record => record.get(this.model.idKey));

        this.created.map(record => create[record.__id] = Transform.serialize(record.getData(), this.model.fields));

        const modified = this.records
            .filter(record => !record.getFlag('ghost') && record.getFlag('modified'));

        modified.forEach(
            record => update[record.__id] = Transform.serialize(record.getData(), this.model.fields));

        const promise = this.gateway.write(
                create,
                del,
                update
            )
            .then(
                payload => {
                    const records = {
                        create: [],
                        'delete': [],
                        update: []
                    };

                    const create = payload.create;

                    if (create) {
                        created.forEach(record => {
                            record.setData(create[record.__id]);
                            record.commit();

                            records.create.push(record);
                        });
                        created.length = 0;
                    }

                    const updated = payload.update;
                    if (updated) {
                        modified.forEach( record => {
                            record.setData(updated[record.__id]);
                            record.commit();

                            records.update.push(record);
                        });
                    }

                    if (this.state) {
                        this.state.removeMany(['create', 'update', 'delete']);
                    }

                    me.fireDataChange();

                    return records;
                }
            )
            .catch(error => this.writeState());

        this.fireEvent('save', this, {create: create, 'delete': del, update: update}, promise);

        return promise;
    }

    public fireDataChange() {
        this.fireEvent('datachange', this.getRecords());
    }
}
