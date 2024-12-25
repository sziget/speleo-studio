const attributeDefintions = {
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
        },
        {
            "id": 3,
            "type": 1,
            "name": "fault",
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

class AttributesDefinitions {
    constructor(attributeDefintions) {
        this.defs = attributeDefintions;
    }

    #cloneDefiniton(predicate) {
        return Object.assign({}, this.#getDefiniton(predicate));
    }

    #getDefiniton(predicate) {
        return this.defs.definitions.find(predicate);
    }
    createById(id) {
        const o = this.#cloneDefiniton(x => x.id === id)
        return this.#attributeByDef(o);
    }

    createByName(name) {
        const o = this.#cloneDefiniton(d => d.name === name);
        return this.#attributeByDef(o);
    }

    createFromPure(attribute) {
        const o = this.#cloneDefiniton(d => d.name === attribute.name);
        const paramNames = Object.keys(o.params);
        paramNames.forEach(pName => {
            o[pName] = attribute[pName];
        });
        return o;
    }

    tranformPureAttributes(attributes) {
        return attributes.map(a => {
            this.createFromPure(a);
        });

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
                    default: throw new Error($`Not supported data type ${dataType}`);
                }

            });
            return o;
        }

        return o.create;
    }
}

export { attributeDefintions, AttributesDefinitions };