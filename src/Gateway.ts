export interface IGateway {
    read(jsql): Promise<any>;

    write(create: {[key: string]: any}, del: any[], update: {[key: string]: any}): Promise<{create: {[key: string]: any}, update: {[key: string]: any}, 'delete': any[]}>;
}
