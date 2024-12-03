import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import * as I from "./import.js";
import * as L from "./listeners.js";
import * as M from "./model.js";
import * as P from "./panel.js";
import * as U from "./utils.js";
import * as A from "./interactive.js";
import * as MAT from "./materials.js";


import { addGui } from "./gui.js";

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, control, orbit, gizmo, gui;

let show = {
    stationNames: false,
    polygon: true,
    splays: false,
    spheres: true
};

let configuration = {
    stationSphereRadius: 1
};

let stationFont;
let caves = [];
let cavesStationSpheresGroup = [];
let cavesObjectGroup = new THREE.Group();
let cavesStationNamesGroup;

init();
render();

function init() {



    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 5;

    cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    cameraOrtho = new THREE.OrthographicCamera(- frustumSize * aspect, frustumSize * aspect, frustumSize, - frustumSize, 0.1, 2000);
    currentCamera = cameraOrtho;

    currentCamera.position.set(0, 0, -100);
    currentCamera.lookAt(0, 0, 0);

    orbit = new OrbitControls(currentCamera, renderer.domElement);
    orbit.update();
    orbit.addEventListener('change', render);

    control = new TransformControls(currentCamera, renderer.domElement);
    control.addEventListener('change', render);
    control.addEventListener('dragging-changed', function (event) {
        orbit.enabled = !event.value;
    });

    const listener = new L.EventListener(control, orbit, currentCamera, cameraPersp, cameraOrtho, onWindowResize);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', function (event) { listener.keyDownListener(event); });
    window.addEventListener('keyup', function (event) { listener.keyUpListener(event); });
    document.addEventListener('pointermove', A.onPointerMove);
    renderer.domElement.addEventListener('click',
        function (event) {
            A.onClick(
                event,
                cavesStationSpheresGroup,
                currentCamera,
                MAT.materials,
                render
            );
        }, false);
    renderer.domElement.addEventListener('mousedown',
        function (event) {
            A.onMouseDown(
                event,
                cavesStationSpheresGroup,
                currentCamera,
                MAT.materials,
                renderer.domElement.getBoundingClientRect(),
                render
            );
        }, false);
    getdistance.addEventListener("click",
        function (event) {
            A.calcualteDistanceListener(
                event,
                renderer.domElement.getBoundingClientRect(),
                MAT.materials,
                scene,
                render
            );
        }, false);

    if (document.addEventListener) {
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false);
    } else {
        document.attachEvent('oncontextmenu', function () {
            window.event.returnValue = false;
        });
    }

    scene = new THREE.Scene();
    const grid = new THREE.GridHelper(100, 10, 0x888888, 0x444444).rotateX(U.degreesToRads(90));
    scene.add(grid);

    gizmo = control.getHelper();
    scene.add(gizmo);

    const loader = new FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        stationFont = font;
    });

    cavesStationNamesGroup = [];

    gui = addGui(caves, show, configuration, gizmo, MAT.materials, render);

}


function render() {
    if (cavesStationNamesGroup !== undefined) {
        cavesStationNamesGroup.forEach(
            group => group.children.forEach(fontMesh =>
                fontMesh.lookAt(currentCamera.position)
            )
        );
    }

    renderer.render(scene, currentCamera);
}

function onWindowResize() {

    const aspect = window.innerWidth / window.innerHeight;

    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    cameraOrtho.left = cameraOrtho.bottom * aspect;
    cameraOrtho.right = cameraOrtho.top * aspect;
    cameraOrtho.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    render();

}



function addStationName(stationName, position, fontGroup) {
    const shortName = stationName.split("@")[0]
    const textShape = stationFont.generateShapes(shortName, 0.7);
    const textGeometry = new THREE.ShapeGeometry(textShape);
    textGeometry.computeBoundingBox();

    const xMid = - 0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
    textGeometry.translate(xMid, 0, 0);

    const textMesh = new THREE.Mesh(textGeometry, MAT.materials.text);
    textMesh.lookAt(currentCamera.position)
    textMesh.position.x = position.x;
    textMesh.position.y = position.y;
    textMesh.position.z = position.z;
    fontGroup.add(textMesh);
}

function addStationSpheres(stationName, position, sphereGroup) {
    const geometry = new THREE.SphereGeometry(configuration.stationSphereRadius / 10.0, 5, 5);
    const sphere = new THREE.Mesh(geometry, MAT.materials.sphere);
    sphere.position.x = position.x;
    sphere.position.y = position.y;
    sphere.position.z = position.z;
    sphere.name = stationName;
    sphereGroup.add(sphere);
    cavesStationSpheresGroup.push(sphere); // global assignment
}

function addToScene(stations, polygonSegments, splaySegments) {
    const geometryStations = new LineSegmentsGeometry();
    geometryStations.setPositions(polygonSegments);
    const lineSegmentsPolygon = new LineSegments2(geometryStations, MAT.materials.polygon);
    lineSegmentsPolygon.visible = show.polygon;

    const splaysGeometry = new LineSegmentsGeometry();
    splaysGeometry.setPositions(splaySegments);
    const lineSegmentsSplays = new LineSegments2(splaysGeometry, MAT.materials.splay);
    lineSegmentsSplays.visible = show.splays;
    const group = new THREE.Group();

    group.add(lineSegmentsPolygon);
    group.add(lineSegmentsSplays);

    const stationNamesGroup = new THREE.Group();
    const stationSpheresGroup = new THREE.Group();
    for (const [stationName, stationPosition] of stations) {
        addStationName(stationName, stationPosition, stationNamesGroup);
        addStationSpheres(stationName, stationPosition, stationSpheresGroup);
    }

    cavesStationNamesGroup.push(stationNamesGroup);

    stationNamesGroup.visible = show.stationNames;
    stationSpheresGroup.visible = show.spheres;

    group.add(stationNamesGroup);
    group.add(stationSpheresGroup);
    //scene.add(group); maybe needs to remove
    cavesObjectGroup.add(group);
    scene.add(cavesObjectGroup);
    control.attach(cavesObjectGroup);
    render();
    return [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup];
}

function importPolygonFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const wholeFileInText = event.target.result;
        const cave = I.getCaveFromPolygonFile(wholeFileInText, addToScene);
        caves.push(cave);
        P.renderSurveyPanel(caves, show, render);
    };
    reader.readAsText(file, "iso_8859-2");
}

function showError(message) {
    alert(message);
}

function importCsvFile(file) {
    Papa.parse(file, {
        header: false,
        comments: "#",
        dynamicTyping: true,
        complete: function (results) {
            const [stations, polygonSegments, splaySegments] = I.getStationsAndSplays(results.data);
            const [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup] = addToScene(stations, polygonSegments, splaySegments);
            const cave = new M.Cave(file.name, [new M.Survey('Polygon', true, stations, lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup)], true);
            caves.push(cave);
            P.renderSurveyPanel(caves, show, render);
        },
        error: function (error) {
            console.error('Error parsing CSV:', error);
        }
    });
}

document.getElementById('topodroidInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        importCsvFile(file);
    }
});

document.getElementById('polygonInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        importPolygonFile(file);
    }
});