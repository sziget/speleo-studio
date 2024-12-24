export class Vector {

    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }


    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(d) {
        return new Vector(this.x * d, this.y * d, this.z * d);
    }

    distanceTo(v) {
        const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    toExport() {
        return {
            x: this.x,
            y: this.y,
            z: this.z
        }
    }

    static fromPure(pure) {
        return Object.assign(new Vector, pure);
    }
}

export class Color {

    constructor(r, g, b) {
        if (typeof r === 'number' && g === undefined && b === undefined) {
            this.hex = Math.floor(r);
            this.r = (this.hex >> 16 & 255) / 255;
            this.g = (this.hex >> 8 & 255) / 255;
            this.b = (this.hex & 255) / 255;
        } else {
            this.r = r;
            this.g = g;
            this.b = b;
            this.hex = ((1 << 24) + (r << 16) + (g << 8) + b);
        }
    }

    add(c) {
        return new Color(this.r + c.r, this.g + c.g, this.b + c.b);
    }

    sub(c) {
        return new Color(this.r - c.r, this.g - c.g, this.b - c.b);
    }

    mul(d) {
        return new Color(this.r * d, this.g * d, this.b * d);
    }
}

export class Shot {
    export_fields = ["id", "type", "from", "to", "length", "azimuth", "clino"]

    constructor(id, type, from, to, length, azimuth, clino) {
        this.id = id;
        this.type = type;
        this.from = from;
        this.to = to;
        this.length = length;
        this.azimuth = azimuth;
        this.clino = clino;
        this.processed = false;
    }

    isSplay() {
        return (this.type === 'splay');
    }

    toExport() {
        let newShot = {};
        this.export_fields.forEach(fName => {
            newShot[fName] = this[fName];
        });
        return newShot;
    }
}

export class SurveyStartStation {

    /**
     * Represents the start point, the first station of whole survey
     * 
     * @param {string} name - The name of the starting point for this survey
     * @param {SurveyStation} station - The start position and type of the starting point
     */
    constructor(name, station) {
        this.name = name;
        this.station = station;
    }

    toExport() {
        return {
            name: this.name,
            station: this.station.toExport()
        }
    }

    static fromPure(pure) {
        pure.station = SurveyStation.fromPure(pure.station);
        return Object.assign(new SurveyStartStation, pure);
    }
}

export class StationAttribute {

    constructor(name, attribute) {
        this.name = name;
        this.attribute = attribute;
    }

    toExport() {
        return {
            name: this.name,
            attribute: this.attribute
        }
    }
}

export class SurveyStation {

    /**
     * 
     * @param {string} type - the type of the station, could be center and splay 
     * @param {Vector} position - the 3D vector representing the position of the station
     * @param {Survey} survey - the survey that this station belongs to
     */
    constructor(type, position, survey) {
        this.type = type;
        this.position = position;
        this.survey = survey;
    }

    toExport() {
        return {
            type: this.type,
            position: this.position.toExport()
        }
    }

    static fromPure(pure) {
        pure.position = Vector.fromPure(pure.position);
        return Object.assign(new SurveyStation, pure);
    }
}

export class Survey {

    /**
     * 
     * @param {string} name - The name of the Survey
     * @param {boolean} visible 
     * @param {SurveyStartStation} - The start point of the whole survey that was explicitly specified for a survey
     * @param {Array[Shot]} shots - An array of shots holding the measurements for this Survey
     * @param {Array[Number]} orphanShotIds - An array of orphan shots that are disconnected (from and/or to is unknown)
     * @param {Array[Object]} attributes - Extra attributes (e.g. tectonics information) associated to this Survey
     */
    constructor(name, visible = true, start = undefined, shots = [], orphanShotIds = new Set(), attributes = []) {
        this.name = name;
        this.visible = visible;
        this.start = start;
        this.shots = shots;
        this.orphanShotIds = orphanShotIds;
        this.attributes = attributes;
        this.isolated = false;
    }

    getSplayStationName(id) {
        return `splay-${id}@${this.name}`
    }

    getFromStationName(shot) {
        return (shot.fromAlias !== undefined) ? shot.fromAlias : shot.from;
    }


    getToStationName(shot) {
        if (shot.isSplay()) {
            return this.getSplayStationName(shot.id);
        } else if (shot.toAlias !== undefined) {
            return shot.toAlias;
        } else {
            return shot.to;
        }
    }

    /**
     * Returns all the attributes with the given id for all stations
     * 
     * @param {string} name - The name an attribute, see attribute definitons for more information.
     * @returns {Array[Array[Vector, Object]]>} - Attribute params with 3D position
     */
    getAttributesWithPositionsByName(name) {
        // [stationName, -> [ { id, params},  ]
        return this.attributes
            .filter(sa => sa.attribute.name === name)
            .map(sa => {
                const pos = this.stations.get(sa.name).position;
                return [pos, sa.attribute];

            });
    }

    static attibuteWithIdandType(a, defs) {
        const def = defs.getDefinition(a.name);
        a.params = def.params;
        a.id = def.id;
        a.type = def.type;
        return a;
    }



    toExport() {
        return {
            name: this.name,
            start: this.start.toExport(),
            attributes: this.attributes.map(sta => sta.toExport()),
            shots: this.shots.map(s => s.toExport())
        }
    }

    static fromPure(pure, attributeDefs) {
        if (pure.start !== undefined) {
            pure.start = SurveyStartStation.fromPure(pure.start);
        }
        pure.attributes =
            pure.attributes
                .map(a => new StationAttribute(a.name, attributeDefs.createFromPure(a.attribute)));;
        pure.shots = pure.shots.map(s => Object.assign(new Shot, s));
        return Object.assign(new Survey, pure);
    }

}

export class SurveyAlias {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }

    contains(n) {
        return this.from === n || this.to === n;
    }

    getPair(n) {
        if (this.from === n) {
            return this.to;
        } else if (this.to === n) {
            return this.from;
        } else {
            return undefined;
        }
    }

    toExport() {
        return {
            from: this.from,
            to: this.to
        }
    }

    static fromPure(pure) {
        return Object.assign(new SurveyAlias, pure);
    }
}

export class Surface {
    /**
     * 
     * @param {string} name - The name of the surface
     * @param {Array[Vector]} points - The points that define the surface
     * @param {Vector} center - The center of the surface bounding box
     * @param {boolean} visible - The visibility property of the surface
     */
    constructor(name, points = [], center, visible = true) {
        this.name = name;
        this.points = points;
        this.center = center;
        this.visible = visible;
    }


}

export class Cave {
    /**
     * 
     * @param {string} name - The name of the cave
     * @param {Vector} startPosition - The start position of the cave that is defined by the first survey
     * @param {Map<string, SurveyStation>} stations - The merged map of all survey stations
     * @param {Survey[]} surveys - The surveys associated to a cave
     * @param {SurveyAlias[]} - Mapping of connection point between surveys
     * @param {boolean} visible - The visibility property of a cave
     */
    constructor(name, startPosition, stations = new Map(), surveys = [], aliases = [], visible = true) {
        this.name = name;
        this.startPosition = startPosition;
        this.stations = stations;
        this.surveys = surveys;
        this.aliases = aliases;
        this.visible = visible;
    }

    toExport() {
        return {
            name: this.name,
            startPosition: this.startPosition,
            aliases: this.aliases.map(a => a.toExport()),
            surveys: this.surveys.map(s => s.toExport())
        }
    }

    static fromPure(pure, attributeDefs) {
        pure.surveys = pure.surveys.map(s => Survey.fromPure(s, attributeDefs));
        pure.aliases = pure.aliases.map(a => SurveyAlias.fromPure(a));
        pure.startPosition = Vector.fromPure(pure.startPosition);
        return Object.assign(new Cave, pure);
    }
}
