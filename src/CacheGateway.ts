import {ICache} from "ii-cache";
import {IGateway} from "./Gateway";
import * as hash from "hash-code";

export class CacheGateway implements IGateway {
    constructor(private cache: ICache, private liveGateway: IGateway) {
    }

    read(jsql): Promise<any> {
        const key = 'read' + hash.hashCode(JSON.stringify(jsql));
        const value = this.cache.get(key);

        if (value !== null) {
            return Promise.resolve(value);
        }
        else {
            return this.liveGateway
                .read(jsql)
                .then(
                    value => {
                        this.cache.set(key, value);
                        return value;
                    }
                );
        }
    }

    write(create, del, update): Promise<{create: {[key: string]: any}, update: any[], 'delete': any[]}> {
        return this.liveGateway.write(create, del, update);
    }
}