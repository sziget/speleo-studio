export const attributeDefintions = {
    "types": [
        {
            "id": 1,
            "name": "geology"
        }
    ],
    "definitions": [
        {
            "id": 1,
            "type": 1,
            "name": "speleotheme",
            "params": {
                "type": {
                    "required": true,
                    "type": "string",
                    "values": [
                        "dripstone",
                        "mammilary"
                    ]
                },
                "description": {
                    "type": "string",
                }
            }
        },
        {
            "id": 2,
            "type": 1,
            "name": "bedding",
            "params": {
                "dip": {
                    "type": "number"
                },
                "azimuth": {
                    "type": "number"
                }
            }
        }
    ]
}

export class AttributesDefinitions {
    constructor(attributeDefintions) {
        this.defs = attributeDefintions;
    }

    createById(id) {
        const o = this.defs.definitions.find(d => d.id === id);
        return this.#attributeByDef(o);
    }

    createByName(name) {
        const o = this.defs.definitions.find(d => d.name === name);
        return this.#attributeByDef(o);
    }

    #attributeByDef(o) {
        const paramNames = Object.keys(o.params);
        o.create = function (...varargs) {
            Array.from(varargs.entries()).forEach(([index, value]) => {
                const pName = paramNames[index];
                o[pName] = value;
            });
            return o;
        }

        return o.create;
    }
}