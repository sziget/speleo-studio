import * as THREE from 'three';

export function fromPolar(distance, azimuth, clino) {
    return new THREE.Vector3(
        Math.cos(azimuth) * Math.cos(clino) * distance,
        Math.sin(azimuth) * Math.cos(clino) * distance,
        Math.sin(clino) * distance
    );
}

export function degreesToRads(deg) { return deg * Math.PI / 180.0; }

export function randomAlphaNumbericString(maxLength) { return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, maxLength); }