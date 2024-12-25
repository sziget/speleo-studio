import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as THREE from 'three';
import { Color } from "../model.js";

export function addGui(options, scene, materials, element) {
    const show = options.scene.show;
    const gui = new GUI({ container: element });
    const centerLineParam = {
        'show center lines': show.centerLine.segments,
        'line color': materials.segments.centerLine.color.getHex(),
        'gradient start color': options.scene.caveLines.color.start.hex,
        'gradient end color': options.scene.caveLines.color.end.hex,
        'world units': false,
        'width': 20,
        'show station': show.centerLine.spheres,
        'station color': materials.sphere.centerLine.color.getHex(),
        'station size': options.scene.stationSphereRadius.centerLine
    };

    const splayParam = {
        'show splays': show.splay.segments,
        'line color': materials.segments.splay.color.getHex(),
        'world units': false,
        'width': 10,
        'show station': show.splay.spheres,
        'station color': materials.sphere.splay.color.getHex(),
        'station size': options.scene.stationSphereRadius.splay 
    };

    const stationNamesParam = {
        'show station names': show.stationNames,
        'font color': materials.text.color.getHex(),
    }

    const centerLineFolder = gui.addFolder('Center lines');

    centerLineFolder.add(centerLineParam, 'show center lines').onChange(function (val) {
        show.centerLine.segments = val;
        scene.setObjectsVisibility('centerLines', val);
    });

    centerLineFolder.addColor(centerLineParam, 'line color').onChange(function (val) {
        materials.segments.centerLine.color = new THREE.Color(val);
        scene.renderScene();
    });

    centerLineFolder.addColor(centerLineParam, 'gradient start color').onChange(function (val) {
        options.scene.caveLines.color.start = new Color(val);
    });

    centerLineFolder.addColor(centerLineParam, 'gradient end color').onChange(function (val) {
        options.scene.caveLines.color.end = new Color(val);
    });

    centerLineFolder.add(centerLineParam, 'world units').onChange(function (val) {
        materials.segments.centerLine.worldUnits = val;
        scene.renderScene();

    });

    centerLineFolder.add(centerLineParam, 'width', 1, 50).onChange(function (val) {
        materials.segments.centerLine.linewidth = val / 10;
        materials.whiteLine.linewidth = val / 10;
        scene.renderScene();
    });

    centerLineFolder.add(centerLineParam, 'show station').onChange(function (val) {
        show.centerLine.spheres = val;
        scene.setObjectsVisibility('centerLinesSpheres', val);
    });

    centerLineFolder.addColor(centerLineParam, 'station color').onChange(function (val) { 
        materials.sphere.centerLine.color = new THREE.Color(val);
        scene.renderScene();
    });

    centerLineFolder.add(centerLineParam, 'station size', 1, 50).step(1).onChange(function (val) {
        options.scene.stationSphereRadius.centerLine = val;
        scene.changeStationSpheresRadius('centerLine');
    });

    const splaysFolder = gui.addFolder('Splays');

    splaysFolder.add(splayParam, 'show splays').onChange(function (val) {
        show.splay.segments = val;
        scene.setObjectsVisibility('splays', val);
    });

    splaysFolder.addColor(splayParam, 'line color').onChange(function (val) {
        materials.segments.splay.color = new THREE.Color(val);
        scene.renderScene();
    });

    splaysFolder.add(splayParam, 'world units').onChange(function (val) {
        materials.segments.splay.worldUnits = val;
        materials.segments.splay.needsUpdate = true;
        scene.renderScene();

    });

    splaysFolder.add(splayParam, 'width', 1, 30).onChange(function (val) {
        materials.segments.splay.linewidth = val / 10;
        scene.renderScene();
    });

    splaysFolder.add(splayParam, 'show station').onChange(function (val) {
        show.splay.spheres = val;
        scene.setObjectsVisibility('splaysSpheres', val);
    });

    splaysFolder.addColor(splayParam, 'station color').onChange(function (val) { 
        materials.sphere.splay.color = new THREE.Color(val);
        scene.renderScene();
    });

    splaysFolder.add(splayParam, 'station size', 1, 50).step(1).onChange(function (val) {
        options.scene.stationSphereRadius.splay = val;
        scene.changeStationSpheresRadius('splay');
    });    

    const stationNamesFolder = gui.addFolder('Station names');

    stationNamesFolder.add(stationNamesParam, 'show station names').onChange(function (val) {
        show.stationNames = val;
        scene.setObjectsVisibility('stationNames', val);
    });

    stationNamesFolder.addColor(stationNamesParam, 'font color').onChange(function (val) {
        materials.text.color = new THREE.Color(val);
        scene.renderScene();
    });


    return gui;

}