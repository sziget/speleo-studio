import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

import * as I from "./import.js";
import * as L from "./listeners.js";

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, control, orbit;

init();
render();

function init() {
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
    window.addEventListener('keydown', function ( event ) { listener.keyDownListener(event); });
    window.addEventListener('keyup', function ( event ) { listener.keyUpListener(event); });

    scene = new THREE.Scene();
    scene.add(new THREE.GridHelper(100, 10, 0x888888, 0x444444));
    
    const gizmo = control.getHelper();
    scene.add(gizmo);

}

const matLine = new LineMaterial({
    color: 0xffffff,
    linewidth: 1, // in world units with size attenuation, pixels otherwise
    worldUnits: false,
    vertexColors: false,
    alphaToCoverage: false,
});

function render() {
    renderer.render(scene, currentCamera);
}

function onWindowResize() {

    const aspect = window.innerWidth / window.innerHeight;

    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    cameraOrtho.left = cameraOrtho.bottom * aspect;
    cameraOrtho.right = cameraOrtho.top * aspect;
    cameraOrtho.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    render();

}


function addToScene(stationsPoints, splays) {
    const geometryStations = new LineSegmentsGeometry();
    geometryStations.setPositions(stationsPoints);
    const polygonSegments = new LineSegments2(geometryStations, matLine);
    scene.add(polygonSegments);
    control.attach( polygonSegments );

    // const splaysGeometry = new LineSegmentsGeometry();
    // splaysGeometry.setPositions(splays);
    // const segmentsSplays = new LineSegments2( splaysGeometry, matLine );
    // scene.add( segmentsSplays );
    // control.attach( segmentsSplays );

    render();
}

function importCsvFile(file) {
    Papa.parse(file, {
        header: false,
        comments: "#",
        dynamicTyping: true,
        complete: function (results) {
            const [stations, stationsPoints, splays] = I.getStationsAndSplays(results.data);
            addToScene(stationsPoints, splays);
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