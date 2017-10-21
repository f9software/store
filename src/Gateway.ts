export interface IGateway {
    read(jsql): Promise<any>;

    write(added, removed, updated): Promise<{create: {[key: string]: any}, update: any[], 'delete': any[]}>;
}
