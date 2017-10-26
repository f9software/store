export interface IState {
    set(key: string, value: any);
    get(key: string): any;
    removeMany(keys: string[]);
}
