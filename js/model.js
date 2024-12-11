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
    constructor(name, visible, stations, shots) {
        this.name = name;
        this.visible = visible;
        this.stations = stations;
        this.shots = shots;
        this.isolated = false;
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
    constructor(name, surveys, visible) {
        this.name = name;
        this.surveys = surveys;
        this.visible = visible;
    }
}
