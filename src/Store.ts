import {Transform} from "./Transform";
import {IGateway} from "./Gateway";
import {IModel, IModelClass} from "./Model";
import {Observable} from "ii-observable";
import {JSql, Order} from "ii-jsql";

export interface IFilter {
    property: string;
    // operator: string;
    value: string | number;
}

export class Store<M extends IModel<T>, T> extends Observable {
    protected model: IModelClass<T>;

    private records: M[] = [];

    private removed: M[] = [];

    private added: M[] = [];

    private filters: IFilter[] = [];

    private sort: Order;

    constructor(private gateway: IGateway) {
        super();
    }

    protected initEvents() {
        return [
            'datachange',
            'add',
            'remove',
            'update'
        ];
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
        this.records = data.map(itemData => new this.model(Transform.data(itemData, this.model.fields), false));

        const records = this.getRecords();
        this.fireEvent('datachange', records);

        return records;
    }

    getRecords(): M[] {
        return [].concat(this.records);
    }

    private filterToJsql(filters) {
        const jsql = [];

        filters.forEach(
            (filter, index, arr) => {
                jsql.push({
                    [filter.property]: filter.value
                });

                if (index < arr.length - 1) {
                    jsql.push('AND');
                }
            }
        )

        return jsql;
    }

    load(page: number = 1, limit: number = 25): Promise<M[]> {
        const jsql: JSql = {
            limit: [page * limit - limit, limit]
        };

        const where = this.filterToJsql(this.filters)
        const order = this.getSort();

        if (where && where.length > 0) {
            jsql.where = where;
        }

        if (order) {
            jsql.order = order;
        }

        return this.gateway.read(jsql).then(this.loadData.bind(this));
    }

    add(records: M[]) {
        this.insert(this.records.length, records);
    }

    insert(index: number = 0, records: M[]) {
        Array.prototype.splice.apply(this.records, (<any[]> [index, 0]).concat(records));
        this.added = this.added.concat(records);
        this.fireEvent('add', records);
    }

    remove(records: M[]) {
        this.records = this.records.filter(record => records.indexOf(record) === -1);
        this.removed = this.removed.concat(records);
        this.fireEvent('remove', records);
    }

    save() {
        const me = this;
        const added = this.added;
        const create = {};
        const update = {};
        const del = this.removed.map(record => record.getData());

        this.added.map(record => create[record.__id] = Transform.serialize(record.getData(), this.model.fields));

        const modified = this.records
            .filter(record => !record.getFlag('ghost') && record.getFlag('modified'));

        modified.forEach(
            record => update[record.__id] = Transform.serialize(record.getData(), this.model.fields));

        return this.gateway.write(
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
                        added.forEach(record => {
                            record.setData(create[record.__id]);
                            record.commit();

                            records.create.push(record);
                        });
                        added.length = 0;
                    }

                    const updated = payload.update;
                    if (updated) {
                        modified.forEach( record => {
                            record.setData(updated[record.__id]);
                            record.commit();

                            records.update.push(record);
                        });
                    }

                    me.fireDataChange();

                    return records;
                }
            );
    }

    public fireDataChange() {
        this.fireEvent('datachange', this.getRecords());
    }
}
