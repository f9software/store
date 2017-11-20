export interface IGateway {
    read(jsql, params?: {[key: string]: any}): Promise<any>;

    write(
        create: {[key: string]: any},
        del: string[],
        update: {[key: string]: any},
        params: {[key: string]: any}
    ): Promise<{create: {[key: string]: any}, update: {[key: string]: any}, 'delete': any[]}>;
}
