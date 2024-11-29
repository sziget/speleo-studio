import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export function addGui(lineSegmentsSplays, gizmo, matLine, renderFn) {
    const gui = new GUI();

    const param = {
        'show gizmo': true,
        'show splays': true,
        'world units': false,
        'width': 10,
        'alphaToCoverage': true
    };


    gui.add(param, 'show splays').onChange(function (val) {
        lineSegmentsSplays.visible = val;
        renderFn();
    });

    gui.add(param, 'show gizmo').onChange(function (val) {
        gizmo.visible = val;
        renderFn();
    });    

    gui.add(param, 'world units').onChange(function (val) {

        matLine.worldUnits = val;
        matLine.needsUpdate = true;
        renderFn();

    });

    gui.add(param, 'width', 1, 30).onChange(function (val) {

        matLine.linewidth = val / 10;
        renderFn();

    });

    gui.add(param, 'alphaToCoverage').onChange(function (val) {

        matLine.alphaToCoverage = val;
        renderFn();

    });

    return gui;

}