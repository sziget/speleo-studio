import * as THREE from 'three';

export function fromPolar(distance, azimuth, clino) {
    const h = Math.cos(clino) * distance;
    return new THREE.Vector3(
        Math.sin(azimuth) * h, //TODO: don't forget declination
        Math.cos(azimuth) * h, //TODO: don't forget declination
        Math.sin(clino) * distance
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