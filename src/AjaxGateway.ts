import {Ajax} from "ii-ajax";
import {IGateway} from "./Gateway";

export type Endpoint = 'create' | 'read' | 'update' | 'delete';

export class AjaxGateway implements IGateway {
    private endpoints = {
        create: 'create',
        read: 'read',
        update: 'update',
        'delete': 'delete'
    };

    constructor(private url: string, endpoints?: {[key: string]: string}) {
        if (endpoints) {
            Object.keys(endpoints)
                .forEach(type => this.endpoints.hasOwnProperty(type) ? this.endpoints[type] = endpoints[type] : null)
        }
    }

    private getEndpoint(type: Endpoint): string {
        let endpoint = type;

        if (type !== this.endpoints[type]) {
            endpoint += ':' + this.endpoints[type];
        }

        return endpoint;
    }

    read(payload: {[key: string]: any}): Promise<any> {
        const ajax = new Ajax('POST', this.url);

        return new Promise(
            (resolve, reject) => {
                ajax.send({
                    [this.getEndpoint('read')]: payload
                }).then(
                    (xhr: XMLHttpRequest) => {
                        resolve(JSON.parse(xhr.responseText).read);
                    }
                )
            }
        );
    }

    write(added, deleted, updated): Promise<{create: {[key: string]: any}, update: any[], 'delete': any[]}> {
        const url = this.url;
        const ajax = new Ajax('POST', url);

        return new Promise(
            (resolve, reject) => {
                ajax.send({
                        [this.getEndpoint('create')]: added,
                        [this.getEndpoint('update')]: updated,
                        [this.getEndpoint('delete')]: deleted
                    })
                    .then((xhr: XMLHttpRequest) => resolve(JSON.parse(xhr.responseText)))
                    .catch((xhr: XMLHttpRequest) => reject())
            }
        );
    }
}
