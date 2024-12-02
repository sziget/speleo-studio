export class Vector {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }


    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    }
}

export class Survey {
    constructor(name, stations, polygonSegments, splaySegments) {
        this.name = name;
        this.stations = stations;
        this.polygonSegments = polygonSegments;
        this.splaySegments = splaySegments;
    }
}

export class Cave {
    constructor(name, surveys) {
        this.name = name;
        this.surveys = surveys;
    }
}

