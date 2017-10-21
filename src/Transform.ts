import {Fields} from "./Model";
import * as moment from "moment";

export class Transform {
    public static to = {
        // boolean: value => value === 1 || value === 'Y' || value === 'Yes' || value === true,
        // number: value => value * 1,
        date: value => new Date(value)
    }

    public static from = {
        date: value => moment.utc(value).format()
    }

    public static data(data: {[key: string]: string | number}, fields: Fields) {
        const newData = {};

        Object.keys(data)
            .forEach(
                (key: keyof Fields) => {
                    let value = data[key];
                    let newValue = value;

                    if (fields.hasOwnProperty(key)) {
                        const field = fields[key];

                        if (field.transform) {
                            newValue = field.transform(value);
                        }
                        else if (field.type && Transform.to.hasOwnProperty(field.type)) {
                            newValue = Transform.to[field.type](value);
                        }
                    }

                    newData[key] = value;
                }
            );

        return newData;
    }

    public static serialize(data: {[key: string]: any}, fields: Fields) {
        const newData = {};

        Object.keys(data)
            .forEach(
                (key: keyof Fields) => {
                    let value = data[key];

                    if (fields.hasOwnProperty(key)) {
                        const field = fields[key];

                        if (field.type && Transform.from.hasOwnProperty(field.type)) {
                            value = Transform.from[field.type](value);
                        }
                    }

                    newData[key] = value;
                }
            );


        return newData;
    }

    public static register(type: string, fn: Function) {
        Transform.to[type] = fn;
    }
}
