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

export class Survey {

    /**
     * 
     * @param {string} name - The name of the Survey
     * @param {boolean} visible 
     * @param {Map<String, Vector>} stations - A map of station names and station positions
     * @param {Array[Shot]} shots - An array of shots holding the measurements for this Survey
     * @param {Array[Number]} orphanShotIds - An array of orphan shots that are disconnected (from and/or to is unknown)
     * @param {Array[Object]} attributes - Extra attributes (e.g. tectonics information) associated to this Survey
     */
    constructor(name, visible, stations, shots, orphanShotIds, attributes) {
        this.name = name;
        this.visible = visible;
        this.stations = stations;
        this.shots = shots;
        this.orphanShotIds = orphanShotIds;
        this.attributes = attributes;
        this.isolated = false;
    }

    /**
     * Returns all the attributes with the given id for all stations
     * 
     * @param {Number} id - The numerical identifier of an attribute, see attribute definitons for more information
     * @returns {Array[Array[Vector, Object]]>} - Attribute params with 3D position
     */
    getSurveyAttributesById(id) {
        //stationName -> [ { id, params},  ]
        const vv = Array.from(this.attributes.entries().map(([station, arrayOfAtrs]) => {
            const pos = this.stations.get(station);
            const matchingAttrs = arrayOfAtrs.filter(a => a.id === id);
            if (matchingAttrs.length > 0) {
                return [pos, matchingAttrs];
            } 
        }));
        return vv.filter(x => x !== undefined);
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
     * @param {*} name - The name of the cave
     * @param {Survey[]} surveys - The surveys associated to a cave
     * @param {boolean} visible - The visibility property of a cave
     */
    constructor(name, surveys, visible) {
        this.name = name;
        this.surveys = surveys;
        this.visible = visible;
    }
}
