import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import * as I from "./import.js";
import * as L from "./listeners.js";
import { addGui } from "./gui.js"

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, control, orbit, gizmo;
let gui, polygonLineMaterial, splayLineMaterial, textMaterial;
let polygonSegments, lineSegmentsSplays;
let stationFont, fontGroup;

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

    cameraPersp = new THREE.PerspectiveCamera(50, aspect, 1, 500);
    cameraOrtho = new THREE.OrthographicCamera(- frustumSize * aspect, frustumSize * aspect, frustumSize, - frustumSize, 0.1, 100);
    currentCamera = cameraPersp;

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
    scene.add(new THREE.GridHelper(100, 10, 0x888888, 0x444444));

    gizmo = control.getHelper();
    scene.add(gizmo);

    const loader = new FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        stationFont = font;
    });
}


function render() {
    if (fontGroup !== undefined) {
        fontGroup.children.forEach(font => font.lookAt(currentCamera.position));
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
    polygonSegments = new LineSegments2(geometryStations, polygonLineMaterial);

    const splaysGeometry = new LineSegmentsGeometry();
    splaysGeometry.setPositions(splaySegments);
    lineSegmentsSplays = new LineSegments2(splaysGeometry, splayLineMaterial);
    const group = new THREE.Group();

    group.add(polygonSegments);
    group.add(lineSegmentsSplays);

    fontGroup = new THREE.Group();
    for (const [stationName, stationPosition] of stations) {
        addStationName(stationName, stationPosition, fontGroup);
    }
    fontGroup.visible = false;
    group.add(fontGroup);

    scene.add(group);
    control.attach(group);
    gui = addGui(polygonSegments, lineSegmentsSplays, gizmo, polygonLineMaterial, splayLineMaterial, textMaterial, fontGroup, render);
    render();
}

function importCsvFile(file) {
    Papa.parse(file, {
        header: false,
        comments: "#",
        dynamicTyping: true,
        complete: function (results) {
            const [stations, stationsPoints, splays] = I.getStationsAndSplays(results.data);
            addToScene(stations, stationsPoints, splays);
        },
        error: function (error) {
            console.error('Error parsing CSV:', error);
        }
    });
}

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        importCsvFile(file);
    }
});