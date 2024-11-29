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

