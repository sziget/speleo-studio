const attributeDefintions = {
  types : [
    {
      id   : 1,
      name : 'geology'
    },
    {
      id   : 2,
      name : 'equipment'
    },
    {
      id   : 3,
      name : 'metadata'
    }
  ],
  definitions : [
    {
      id     : 1,
      type   : 1,
      name   : 'speleotheme',
      params : {
        type : {
          required : true,
          type     : 'string',
          values   : ['dripstone', 'mammilary']
        },
        description : {
          type : 'string'
        }
      }
    },
    {
      id     : 2,
      type   : 1,
      name   : 'bedding',
      params : {
        azimuth : {
          type : 'float'
        },
        dip : {
          type : 'float'
        },
        width : {
          type : 'int'
        },
        height : {
          type : 'int'
        }
      }
    },
    {
      id     : 3,
      type   : 1,
      name   : 'fault',
      params : {
        azimuth : {
          type : 'float'
        },
        dip : {
          type : 'float'
        },
        width : {
          type : 'int'
        },
        height : {
          type : 'int'
        }
      }
    },
    {
      id     : 4,
      type   : 2,
      name   : 'rope',
      params : {
        type : {
          type : 'string'
        }
      }
    },
    {
      id     : 5,
      type   : 3,
      name   : 'label',
      params : {
        value : {
          type : 'string'
        }
      }
    }
  ]
};

class AttributesDefinitions {

  attributesPattern = /((?<name>[A-Za-z]+)(\((?<params>[A-Za-z0-9., ":{}]+)\))?)/g;

  constructor(attributeDefintions) {
    this.defs = attributeDefintions;
  }

  #cloneDefiniton(predicate) {
    const definition = this.#getDefiniton(predicate);
    if (definition === undefined) {
      return undefined;
    } else {
      return Object.assign({}, definition);
    }
  }

  #getDefiniton(predicate) {
    return this.defs.definitions.find(predicate);
  }
  createById(id) {
    const o = this.#cloneDefiniton((x) => x.id === id);
    if (o !== undefined) {
      return this.#attributeByDef(o);
    } else {
      return undefined;
    }
  }

  createByName(name) {
    const o = this.#cloneDefiniton((d) => d.name === name);
    if (o !== undefined) {
      return this.#attributeByDef(o);
    } else {
      return undefined;
    }
  }

  createFromPure(attribute) {
    const o = this.#cloneDefiniton((d) => d.name === attribute.name);
    const paramNames = Object.keys(o.params);
    paramNames.forEach((pName) => {
      o[pName] = attribute[pName];
    });
    return o;
  }

  tranformPureAttributes(attributes) {
    return attributes.map((a) => {
      this.createFromPure(a);
    });

  }

  getAttributesFromString(str) {
    const attrs = [];
    const errors = [];

    for (const match of str.matchAll(this.attributesPattern)) {
      const n = match.groups.name;
      const a = this.createByName(n);
      if (a !== undefined) {
        const params = match.groups.params.split(',');
        attrs.push(a(...params));
      } else {
        errors.push(`Cannot find attribute by name '${n}'.`);
      }
    }
    return { errors: errors, attributes: attrs };
  }

  static getAttributesAsString(attrs) {
    return attrs
      .map((a) => {
        const paramNames = Object.keys(a.params);
        const paramValues = paramNames.map((n) => a[n]).join(',');
        return `${a.name}(${paramValues})`;
      })
      .join('|');
  }

  #attributeByDef(o) {
    const paramNames = Object.keys(o.params);
    o.create = function (...varargs) {
      Array.from(varargs.entries()).forEach(([index, value]) => {
        const pName = paramNames[index];
        const dataType = o.params[pName].type;
        switch (dataType) {
          case 'float':
            o[pName] = parseFloat(value);
            break;
          case 'int':
            o[pName] = parseInt(value);
            break;
          case 'string':
            o[pName] = value;
            break;
          default:
            throw new Error(`Not supported data type ${dataType}`);
        }

      });
      return o;
    };

    return o.create;
  }
}

export { attributeDefintions, AttributesDefinitions };
