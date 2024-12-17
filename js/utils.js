import { Vector } from "./model.js";

export function fromPolar(distance, azimuth, clino) {
    const h = Math.cos(clino) * distance;
    return new Vector(
        Math.sin(azimuth) * h, //TODO: don't forget declination
        Math.cos(azimuth) * h, //TODO: don't forget declination
        Math.sin(clino) * distance
    );
}

// https://courses.eas.ualberta.ca/eas421/formulasheets/formulasheetxythetaP12010.pdf
export function normal(azimuth, clino) {
    const h = Math.sin(clino);
    return new Vector(
        - Math.cos(azimuth) * h, //TODO: don't forget declination
        Math.sin(azimuth) * h, //TODO: don't forget declination
        - Math.cos(clino)
    );
}

const deg2rad = Math.PI / 180.0;

export function degreesToRads(deg) { return deg * deg2rad; }

export function randomAlphaNumbericString(maxLength) { return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, maxLength); }

export function parseMyFloat(strOrNum) {
    if (typeof strOrNum === 'number') {
        return parseFloat(strOrNum);
    } else if (typeof strOrNum === 'string') {
        return parseFloat(strOrNum.replace(',', '.'));
    } else {
        return parseFloat(strOrNum);
    }
}

export function get3DCoordsStr(vector) {
    const s = ['x', 'y', 'z'].map(n => vector[n].toFixed(2)).join(', ');
    return `(${s})`;
}