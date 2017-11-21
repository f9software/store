import {CacheGateway} from "./CacheGateway";
import {Store} from "./Store";
import {Ajax} from "ii-ajax";

export class Head {
    private stores = {};

    // timeout id
    private tid: number = -1;

    // interval id
    private iid: number = -1;

    private runTime: number;

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
        this.runTime = new Date().getTime();
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
        let timeout = 0;
        const msInterval = interval * 1000;

        if (typeof this.runTime === 'number') {
            const now = new Date().getTime();
            if (now - this.runTime >= msInterval) {
                timeout = 0;
            }
            else {
                timeout = (this.runTime + msInterval) - now;
            }
        }

        this.tid = window.setTimeout(
            () => {
                this.tid = -1;
                this.run();
                this.iid = window.setInterval(this.run.bind(this), msInterval);
            },
            timeout
        );
    }

    stop() {
        if (this.iid > -1) {
            clearTimeout(this.iid);
            this.iid = -1;
        }

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
