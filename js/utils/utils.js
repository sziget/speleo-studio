import { Vector } from "../model.js";

function fromPolar(distance, azimuth, clino) {
    const h = Math.cos(clino) * distance;
    return new Vector(
        Math.sin(azimuth) * h, //TODO: don't forget declination
        Math.cos(azimuth) * h, //TODO: don't forget declination
        Math.sin(clino) * distance
    );
}

// https://courses.eas.ualberta.ca/eas421/formulasheets/formulasheetxythetaP12010.pdf
function normal(azimuth, clino) {
    const h = Math.sin(clino);
    return new Vector(
        - Math.cos(azimuth) * h, //TODO: don't forget declination
        Math.sin(azimuth) * h, //TODO: don't forget declination
        - Math.cos(clino)
    );
}

const deg2rad = Math.PI / 180.0;

function degreesToRads(deg) { return deg * deg2rad; }

function randomAlphaNumbericString(maxLength) { return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, maxLength); }

function parseMyFloat(strOrNum) {
    if (typeof strOrNum === 'number') {
        return parseFloat(strOrNum);
    } else if (typeof strOrNum === 'string') {
        return parseFloat(strOrNum.replace(',', '.'));
    } else {
        return parseFloat(strOrNum);
    }
}

function get3DCoordsStr(vector) {
    const s = ['x', 'y', 'z'].map(n => vector[n].toFixed(2)).join(', ');
    return `(${s})`;
}

function iterateUntil(iterator, condition) {
    var it;
    do {
        it = iterator.next();
    } while (!it.done && condition(it.value[1]));

    if (it.done) {
        return undefined;
    } else {
        return it.value[1];
    }
};

export { fromPolar, normal, degreesToRads, randomAlphaNumbericString, parseMyFloat, get3DCoordsStr, iterateUntil };
