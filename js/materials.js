import * as THREE from 'three';

import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const materials = {
    polygon: new LineMaterial({
        color: 0xff0000,
        linewidth: 1, // in world units with size attenuation, pixels otherwise
        worldUnits: false,
        vertexColors: false,
        alphaToCoverage: false,
    }),
    splay: new LineMaterial({
        color: 0x00ffff,
        linewidth: 1, // in world units with size attenuation, pixels otherwise
        worldUnits: false,
        vertexColors: false,
        alphaToCoverage: false,
    }),
    text: new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide}),
    sphere: new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    selectedSphere: new THREE.MeshBasicMaterial({ color: 0xF00FFF }),
    selectedContextSphere: new THREE.MeshBasicMaterial({ color: 0x20ff3d })
}