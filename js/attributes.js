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
                "azimuth": {
                    "type": "float"
                },
                "dip": {
                    "type": "float"
                },                
                "width": {
                    "type": "int"
                },
                "height": {
                    "type": "int"
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
                const dataType = o.params[pName].type;
                switch (dataType) {
                    case "float": o[pName] = parseFloat(value); break;
                    case "int": o[pName] = parseInt(value); break;
                    case "string": o[pName] = value; break;
                    default : throw new Error($`Not supported data type ${dataType}`);
                }
                
            });
            return o;
        }

        return o.create;
    }
}