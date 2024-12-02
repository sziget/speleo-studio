import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
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
import { addGui } from "./gui.js";

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, control, orbit, gizmo, gui;
let polygonLineMaterial, splayLineMaterial, textMaterial;
let show = {
    stationNames: false, 
    polygon: true,
    splays: true
}; 

let stationFont;
let caves = [];
let cavesObjectGroup = new THREE.Group();
let cavesStationsGroup;

init();
render();

function init() {

    polygonLineMaterial = new LineMaterial({
        color: 0xff0000,
        linewidth: 1, // in world units with size attenuation, pixels otherwise
        worldUnits: false,
        vertexColors: false,
        alphaToCoverage: false,
    });

    splayLineMaterial = new LineMaterial({
        color: 0x00ffff,
        linewidth: 1, // in world units with size attenuation, pixels otherwise
        worldUnits: false,
        vertexColors: false,
        alphaToCoverage: false,
    });

    textMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: false,
        //opacity: 0.9,
        side: THREE.DoubleSide
    });

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

    scene = new THREE.Scene();
    const grid = new THREE.GridHelper(100, 10, 0x888888, 0x444444).rotateX(U.degreesToRads(90));
    scene.add(grid);


    gizmo = control.getHelper();
    scene.add(gizmo);

    const loader = new FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        stationFont = font;
    });
    cavesStationsGroup = [];
    gui = addGui(caves, show, gizmo, polygonLineMaterial, splayLineMaterial, textMaterial, render);

}


function render() {
    if (cavesStationsGroup !== undefined) {
        cavesStationsGroup.forEach(
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

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.lookAt(currentCamera.position)
    textMesh.position.x = position.x;
    textMesh.position.y = position.y;
    textMesh.position.z = position.z;
    fontGroup.add(textMesh);
}

function addToScene(stations, polygonSegments, splaySegments) {
    const geometryStations = new LineSegmentsGeometry();
    geometryStations.setPositions(polygonSegments);
    const lineSegmentsPolygon = new LineSegments2(geometryStations, polygonLineMaterial);

    const splaysGeometry = new LineSegmentsGeometry();
    splaysGeometry.setPositions(splaySegments);
    const lineSegmentsSplays = new LineSegments2(splaysGeometry, splayLineMaterial);
    const group = new THREE.Group();

    group.add(lineSegmentsPolygon);
    group.add(lineSegmentsSplays);

    const stationNamesGroup = new THREE.Group();
    for (const [stationName, stationPosition] of stations) {
        addStationName(stationName, stationPosition, stationNamesGroup);
    }
    cavesStationsGroup.push(stationNamesGroup);

    stationNamesGroup.visible = show.stationNames;

    group.add(stationNamesGroup);
    //scene.add(group); maybe needs to remove
    cavesObjectGroup.add(group);
    scene.add(cavesObjectGroup);
    control.attach(cavesObjectGroup);
    render();
    return [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup];
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
            const [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup] = addToScene(stations, polygonSegments, splaySegments);
            const cave = new M.Cave(file.name, [new M.Survey('Polygon', true, stations, lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup)], true);
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