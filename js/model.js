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
}

export class Color {

    constructor(r, g, b) {
        if (typeof r === 'number' && g === undefined && b === undefined) {
            const hex = Math.floor(r);
            this.r = (hex >> 16 & 255) / 255;
            this.g = (hex >> 8 & 255) / 255;
            this.b = (hex & 255) / 255;
        } else {
            this.r = r;
            this.g = g;
            this.b = b;
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
}
export class SurveyStation {

    /**
     * 
     * @param {string} type - the type of the station, could be center and splay 
     * @param {*} position - the 3D vector representing the position of the station
     */
    constructor(type, position) {
        this.type = type;
        this.position = position;
    }
}

export class Survey {

    /**
     * 
     * @param {string} name - The name of the Survey
     * @param {boolean} visible 
     * @param {SurveyStartStation} - The start point of the whole survey that was explicitly specified for a survey
     * @param {Map<String, SurveyStation>} stations - A map of station names and stations (type, position)
     * @param {Array[Shot]} shots - An array of shots holding the measurements for this Survey
     * @param {Array[Number]} orphanShotIds - An array of orphan shots that are disconnected (from and/or to is unknown)
     * @param {Array[Object]} attributes - Extra attributes (e.g. tectonics information) associated to this Survey
     */
    constructor(name, visible, start = undefined, stations, shots, orphanShotIds, attributes) {
        this.name = name;
        this.visible = visible;
        this.start = start;
        this.stations = stations;
        this.shots = shots;
        this.orphanShotIds = orphanShotIds;
        this.attributes = attributes;
        this.isolated = false;
    }

    static getSplayStationName(surveyName, id) {
        return `splay-${id}@${surveyName}`
    }

    /**
     * Returns all the attributes with the given id for all stations
     * 
     * @param {string} name - The name an attribute, see attribute definitons for more information.
     * @returns {Array[Array[Vector, Object]]>} - Attribute params with 3D position
     */
    getSurveyAttributesByName(name) {
        //stationName -> [ { id, params},  ]
        return this.attributes.entries().map(([station, arrayOfAtrs]) => {
            const pos = this.stations.get(station).position;
            const matchingAttrs = arrayOfAtrs.filter(a => a.name === name);
            if (matchingAttrs.length > 0) {
                return [pos, matchingAttrs];
            } 
        }).filter(x => x !== undefined); // TODO: replace with .reduce()
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
}


export class Cave {
    /**
     * 
     * @param {string} name - The name of the cave
     * @param {Vector} startPosition - The start position of the cave that is defined by the first survey
     * @param {Map<string, SurveyStation>} stations - The merged map of all survey stations
     * @param {Survey[]} surveys - The surveys associated to a cave
     * @param {boolean} visible - The visibility property of a cave
     */
    constructor(name, startPosition, stations, surveys, visible) {
        this.name = name;
        this.startPosition = startPosition;
        this.stations = stations;
        this.surveys = surveys;
        this.visible = visible;
    }
}
