import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as THREE from 'three';

export function addGui(caves, show, configuration, gizmo, polygonMatLine, splayMatLine, textMatLine, sphereMaterial, renderFn) {
    const gui = new GUI();

    const param = {
        'show gizmo': true
    };

    const polygonParam = {

        'show polygon lines': show.polygon,
        'line color': polygonMatLine.color.getHex(),
        'world units': false,
        'width': 20,
        'show station': show.spheres,
        'station color': sphereMaterial.color.getHex(),
        'station size': configuration.stationSphereRadius
    };

    const splayParam = {

        'show splays': show.splays,
        'line color': splayMatLine.color.getHex(),
        'world units': false,
        'width': 10,
    };

    const stationNamesParam = {
        'show station names': show.stationNames,
        'font color': textMatLine.color.getHex(),

    }

    gui.add(param, 'show gizmo').onChange(function (val) {
        gizmo.visible = val;
        renderFn();
    });

    const polygonFolder = gui.addFolder('Polygon');

    polygonFolder.add(polygonParam, 'show polygon lines').onChange(function (val) {
        show.polygon = val;
        caves.forEach(cave => {
            if (cave.visible) {
                cave.surveys.forEach(survey => {
                    if (survey.visible) {
                        survey.polygonSegments.visible = val;
                    }
                })
            }
        });
        renderFn();
    });

    polygonFolder.addColor(polygonParam, 'line color').onChange(function (val) {
        polygonMatLine.color = new THREE.Color(val);
        renderFn();
    });

    polygonFolder.add(polygonParam, 'world units').onChange(function (val) {
        polygonMatLine.worldUnits = val;
        polygonMatLine.needsUpdate = true;
        renderFn();

    });

    polygonFolder.add(polygonParam, 'width', 1, 50).onChange(function (val) {
        polygonMatLine.linewidth = val / 10;
        renderFn();
    });

    polygonFolder.add(polygonParam, 'show station').onChange(function (val) {
        show.polygon = val;
        caves.forEach(cave => {
            if (cave.visible) {
                cave.surveys.forEach(survey => {
                    if (survey.visible) {
                        survey.stationSpheres.visible = val;
                    }
                })
            }
        });
        renderFn();
    });

    polygonFolder.addColor(polygonParam, 'station color').onChange(function (val) {
        sphereMaterial.color = new THREE.Color(val);
        renderFn();
    });

    polygonFolder.add(polygonParam, 'station size', 1, 50).step(1).onChange(function (val) {
        configuration.stationSphereRadius = val;
        caves.forEach(cave => {
            if (cave.visible) {
                cave.surveys.forEach(survey => {
                    survey.stationSpheres.children.forEach((sphereMesh) => {
                        sphereMesh.geometry.dispose(); 
                        sphereMesh.geometry = new THREE.SphereGeometry( configuration.stationSphereRadius / 10.0 , 5, 5 );
                    });
                });
            }
        });
        renderFn();
    });

    const splaysFolder = gui.addFolder('Splays');

    splaysFolder.add(splayParam, 'show splays').onChange(function (val) {
        show.splays = val;
        caves.forEach(cave => {
            if (cave.visible) {
                cave.surveys.forEach(survey => {
                    if (survey.visible) {
                        survey.splaySegments.visible = val;
                    }
                })
            }
        });
        renderFn();
    });

    splaysFolder.addColor(splayParam, 'line color').onChange(function (val) {
        splayMatLine.color = new THREE.Color(val);
        renderFn();
    });

    splaysFolder.add(splayParam, 'world units').onChange(function (val) {

        splayMatLine.worldUnits = val;
        splayMatLine.needsUpdate = true;
        renderFn();

    });

    splaysFolder.add(splayParam, 'width', 1, 30).onChange(function (val) {

        splayMatLine.linewidth = val / 10;
        renderFn();

    });

    const stationNamesFolder = gui.addFolder('Station names');

    stationNamesFolder.add(stationNamesParam, 'show station names').onChange(function (val) {
        show.stationNames = val;
        caves.forEach(cave => {
            if (cave.visible) {
                cave.surveys.forEach(survey => {
                    if (survey.visible) {
                        survey.stationNames.visible = val;
                    }
                })
            }
        });
        renderFn();
    });

    stationNamesFolder.addColor(stationNamesParam, 'font color').onChange(function (val) {
        textMatLine.color = new THREE.Color(val);
        renderFn();
    });


    return gui;

}