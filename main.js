import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

import * as I from "./import.js";

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


    scene = new THREE.Scene();
    scene.add(new THREE.GridHelper(100, 10, 0x888888, 0x444444));

    // scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([C.orbitPoint, new THREE.Vector3(20, 0, 0)]), red));  // x axis
    // scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([C.orbitPoint, new THREE.Vector3(0, 20, 0)]), blue)); // y axis
    // scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([C.orbitPoint, new THREE.Vector3(0, 0, 20)]), green)); // z axis

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

function addToScene(stationsPoints, splays) {
    const geometryStations = new LineSegmentsGeometry();
    geometryStations.setPositions(stationsPoints);
    const polygonSegments = new LineSegments2(geometryStations, matLine);
    scene.add(polygonSegments);

    // const splaysGeometry = new LineSegmentsGeometry();
    // splaysGeometry.setPositions(splays);
    // const segmentsSplays = new LineSegments2( splaysGeometry, matLine );
    // scene.add( segmentsSplays );

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