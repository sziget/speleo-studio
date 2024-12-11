import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as THREE from 'three';

export function addGui(caves, show, configuration, materials, renderFn) {
    const gui = new GUI();
    const polygonParam = {
        'show polygon lines': show.polygon,
        'line color': materials.polygon.color.getHex(),
        'world units': false,
        'width': 20,
        'show station': show.spheres,
        'station color': materials.sphere.color.getHex(),
        'station size': configuration.stationSphereRadius
    };

    const splayParam = {

        'show splays': show.splays,
        'line color': materials.splay.color.getHex(),
        'world units': false,
        'width': 10,
    };

    const stationNamesParam = {
        'show station names': show.stationNames,
        'font color': materials.text.color.getHex(),

    }


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
        materials.polygon.color = new THREE.Color(val);
        renderFn();
    });

    polygonFolder.add(polygonParam, 'world units').onChange(function (val) {
        materials.polygon.worldUnits = val;
        materials.polygon.needsUpdate = true;
        renderFn();

    });

    polygonFolder.add(polygonParam, 'width', 1, 50).onChange(function (val) {
        materials.polygon.linewidth = val / 10;
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
        materials.sphere.color = new THREE.Color(val);
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
        materials.splay.color = new THREE.Color(val);
        renderFn();
    });

    splaysFolder.add(splayParam, 'world units').onChange(function (val) {

        materials.splay.worldUnits = val;
        materials.splay.needsUpdate = true;
        renderFn();

    });

    splaysFolder.add(splayParam, 'width', 1, 30).onChange(function (val) {

        materials.splay.linewidth = val / 10;
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
        materials.text.color = new THREE.Color(val);
        renderFn();
    });


    return gui;

}