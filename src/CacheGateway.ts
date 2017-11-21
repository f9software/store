import {ICache} from "ii-cache";
import {IGateway} from "./Gateway";
import * as hash from "hash-code";

export class CacheGateway implements IGateway {
    constructor(private cache: ICache, private liveGateway: IGateway) {
    }

    read(jsql, params?: {[key: string]: any}): Promise<any> {
        const key = 'read' + hash.hashCode(JSON.stringify(jsql));
        const value = this.cache.get(key);

        if (value !== null) {
            return Promise.resolve(value);
        }
        else {
            return this.liveGateway
                .read(jsql, params)
                .then(
                    value => {
                        this.cache.set(key, value);
                        return value;
                    }
                );
        }
    }

    write(create, del, update, params?: {[key: string]: any}): Promise<{create: {[key: string]: any}, update: {[key: string]: any}, 'delete': any[]}> {
        return this.liveGateway
            .write(create, del, update, params)
            .then(
                result => {
                    // the changes have been saved, so we need to remove all the "read" items in the cache
                    this.clearReadCache();

                    return result;
                }
            );
    }

    clearReadCache() {
        this.cache.removeMany(
            this.cache.getKeys().filter(key => /read/.test(key))
        );
    }
}