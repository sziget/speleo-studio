import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as THREE from 'three';

export function addGui(options, scene, materials, element) {
    const gui = new GUI({ container: element });
    const polygonParam = {
        'show polygon lines': options.scene.show.polygon,
        'line color': materials.polygon.color.getHex(),
        'world units': false,
        'width': 20,
        'show station': options.scene.show.spheres,
        'station color': materials.sphere.color.getHex(),
        'station size': options.scene.stationSphereRadius
    };

    const splayParam = {

        'show splays': options.scene.show.splays,
        'line color': materials.splay.color.getHex(),
        'world units': false,
        'width': 10,
    };

    const stationNamesParam = {
        'show station names': options.scene.show.stationNames,
        'font color': materials.text.color.getHex(),

    }

    const polygonFolder = gui.addFolder('Polygon');

    polygonFolder.add(polygonParam, 'show polygon lines').onChange(function (val) {
        options.scene.show.polygon = val;
        scene.setObjectsVisibility('centerLines', val);
    });

    polygonFolder.addColor(polygonParam, 'line color').onChange(function (val) {
        materials.polygon.color = new THREE.Color(val);
        scene.renderScene();
    });

    polygonFolder.add(polygonParam, 'world units').onChange(function (val) {
        materials.polygon.worldUnits = val;
        scene.renderScene();

    });

    polygonFolder.add(polygonParam, 'width', 1, 50).onChange(function (val) {
        materials.polygon.linewidth = val / 10;
        scene.renderScene();
    });

    polygonFolder.add(polygonParam, 'show station').onChange(function (val) {
        options.scene.show.polygon = val;
        options.scene.show.polygon = val;
        scene.setObjectsVisibility('stationSpheres', val);
    });

    polygonFolder.addColor(polygonParam, 'station color').onChange(function (val) {
        materials.sphere.color = new THREE.Color(val);
        scene.renderScene();
    });

    polygonFolder.add(polygonParam, 'station size', 1, 50).step(1).onChange(function (val) {
        options.scene.stationSphereRadius = val;
        scene.changeStationSpheresRadius();
    });

    const splaysFolder = gui.addFolder('Splays');

    splaysFolder.add(splayParam, 'show splays').onChange(function (val) {
        options.scene.show.splays = val;
        scene.setObjectsVisibility('splays', val);
    });

    splaysFolder.addColor(splayParam, 'line color').onChange(function (val) {
        materials.splay.color = new THREE.Color(val);
        scene.renderScene();
    });

    splaysFolder.add(splayParam, 'world units').onChange(function (val) {
        materials.splay.worldUnits = val;
        materials.splay.needsUpdate = true;
        scene.renderScene();

    });

    splaysFolder.add(splayParam, 'width', 1, 30).onChange(function (val) {
        materials.splay.linewidth = val / 10;
        scene.renderScene();
    });

    const stationNamesFolder = gui.addFolder('Station names');

    stationNamesFolder.add(stationNamesParam, 'show station names').onChange(function (val) {
        options.scene.show.stationNames = val;
        scene.setObjectsVisibility('stationNames', val);
    });

    stationNamesFolder.addColor(stationNamesParam, 'font color').onChange(function (val) {
        materials.text.color = new THREE.Color(val);
        scene.renderScene();
    });


    return gui;

}