import {CacheGateway} from "./CacheGateway";
import {Store} from "./Store";
import {Ajax} from "ii-ajax";

export class Head {
    private stores = {};

    private tid: number = -1;

    constructor(private url) {

    }

    register(id: string, store: Store<any, any>, cacheGateway: CacheGateway) {
        this.stores[id] = {
            store: store,
            gateway: cacheGateway,
            lastHead: null
        };
    }

    run() {
        const ajax = new Ajax('POST', this.url);

        ajax.send(Object.keys(this.stores))
            .then(
                (xhr: XMLHttpRequest) => {
                    const result = JSON.parse(xhr.responseText);

                    Object.keys(result)
                        .forEach(
                            id => {
                                const entry = this.stores[id];
                                if (entry.lastHead < result[id]) {
                                    entry.lastHead = result[id];
                                    entry.gateway.clearReadCache();
                                    if (entry.store.canReload()) {
                                        entry.store.reload();
                                    }
                                }
                            }
                        );
                }
            );
    }

    start(interval: number) {
        this.tid = setInterval(this.run.bind(this), interval * 1000);
    }

    stop() {
        if (this.tid > -1) {
            clearInterval(this.tid);
            this.tid = -1;
        }
    }

    destroy() {
        this.stop();
        this.stores = {};
    }
}
