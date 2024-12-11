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
    constructor(name, visible, stations, shots, polygonSegments, splaySegments, stationNames, stationSpheres) {
        this.name = name;
        this.visible = visible;
        this.stations = stations;
        this.shots = shots;
    }
}

export class Cave {
    constructor(name, surveys, visible) {
        this.name = name;
        this.surveys = surveys;
        this.visible = visible;
    }
}

// this.polygonSegments = polygonSegments;
// this.splaySegments = splaySegments;
// this.stationNames = stationNames;
// this.stationSpheres = stationSpheres;


