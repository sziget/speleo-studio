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
    constructor(name, visible, stations, polygonSegments, splaySegments, stationNames) {
        this.name = name;
        this.visible = visible;
        this.stations = stations;
        this.polygonSegments = polygonSegments;
        this.splaySegments = splaySegments;
        this.stationNames = stationNames;
    }
}

export class Cave {
    constructor(name, surveys, visible) {
        this.name = name;
        this.surveys = surveys;
        this.visible = visible;
    }
}

