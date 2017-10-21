import {Ajax} from "ii-ajax";
import {IGateway} from "./Gateway";

export class AjaxGateway implements IGateway {
    constructor(private url: string) {

    }

    read(jsql): Promise<any> {
        const ajax = new Ajax('POST', this.url);

        return new Promise(
            (resolve, reject) => {
                ajax.send({
                    read: jsql
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
                        create: added,
                        update: updated,
                        'delete': deleted
                    })
                    .then((xhr: XMLHttpRequest) => resolve(JSON.parse(xhr.responseText)))
            }
        );
    }
}
