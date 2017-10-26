import * as _ from "lodash";
import * as uuid from "uuid";

export interface Field {
    type: string;
    transform?: Function
}

export interface Fields {
    [key: string]: Field;
}

export interface IModelClass<T> {
    new (data: Partial<T>, ghost?: boolean): IModel<T>;

    idKey: string;

    getId: (data: Partial<T>) => string | number;

    fields: Fields;
}

export interface IModel<T> {
    readonly __id: string;

    setData(data: Partial<T>);

    getData(): Partial<T>;

    set<K extends keyof T>(key: K, value: T[K]);

    get<K extends keyof T>(key: K): T[K];

    setFlag<K extends keyof Flags>(flag: K, value: Flags[K]);

    getFlag<K extends keyof Flags>(flag: K): Flags[K];

    commit();
}

interface Flags {
    ghost: boolean;
    modified: boolean;
}

export abstract class Model<T> implements IModel<T> {
    private data: Partial<T>;

    private flags: Flags = {
        ghost: true,
        modified: false
    };

    public readonly __id;  // internal id

    constructor(data: Partial<T>, ghost: boolean = true) {
        this.__id = uuid.v1();

        this.setFlag('ghost', ghost);

        const initData = this.init();
        this.data = _.assign(initData, data);
    }

    protected abstract init();

    public setFlag<K extends keyof Flags>(flag: K, value: Flags[K]) {
        this.flags[flag] = value;
    }

    public getFlag<K extends keyof Flags>(flag: K): Flags[K] {
        return this.flags[flag];
    }

    public setData(data: Partial<T>) {
        _.assign(this.data, data);
        this.setFlag('modified', true);
    }

    public getData(): Partial<T> {
        return _.assign({}, this.data);
    }

    public set<K extends keyof T>(key: K, value: T[K]) {
        this.data[key] = value;
        this.setFlag('modified', true);
    }

    public get<K extends keyof T>(key: K): T[K] {
        return this.data[key];
    }

    public commit() {
        const flags = this.flags;

        flags.ghost = false;
        flags.modified = false;
    }
}