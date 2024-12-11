import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import * as C from "./constants.js";
import * as I from "./import.js";
import * as M from "./model.js";
import * as P from "./panel.js";
import * as U from "./utils.js";
import * as A from "./interactive.js";
import * as MAT from "./materials.js";
import * as DATA from "./datapanel.js";
import { buildNavbar, addNavbarClickListener } from "./navbar.js";

import { addGui } from "./gui.js";

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, orbit, gui;

let show = {
    stationNames: false,
    polygon: true,
    splays: false,
    spheres: true
};

let configuration = {
    stationSphereRadius: 1,
    zoomStep: 0.1
};

let stationFont;
let caves = [];
let cavesStationSpheresGroup = [];
let cavesObjectGroup = new THREE.Group();
let cavesObjects = [];

let cavesStationNamesGroup;

init();
render();

//datapanel.style.display = "block";


function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;

    cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    cameraOrtho = new THREE.OrthographicCamera(- C.FRUSTRUM * aspect, C.FRUSTRUM * aspect, C.FRUSTRUM, - C.FRUSTRUM, -1000, 3000);
    currentCamera = cameraOrtho;

    currentCamera.position.set(0, 0, 100);
    currentCamera.lookAt(C.ORBIT_TARGET);

    orbit = new OrbitControls(currentCamera, renderer.domElement);
    orbit.update();
    orbit.addEventListener('change', render);

    window.addEventListener('resize', onWindowResize);
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

    const loader = new FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        stationFont = font;
    });

    cavesStationNamesGroup = [];

    gui = addGui(caves, show, configuration, MAT.materials, render);

    buildNavbar(document.getElementById("navbarcontainer"), [
        {
            "name": "File", elements: [
                { "name": "Open TopoDroid file", "click": function () { topodroidInput.click(); } },
                { "name": "Open Polygon file", "click": function () { polygonInput.click(); } }
            ]
        },
        {
            "name": "View", elements: [
                {
                    "name": "Plan", "click": function () {
                        currentCamera.position.set(0, 0, 100);
                        currentCamera.lookAt(0, 0, 0);
                        render();
                    }
                },
                {
                    "name": "Profile", "click": function () {
                        currentCamera.position.set(0, -100, 0);
                        currentCamera.lookAt(0, 0, 0);
                        render();
                    }
                }
            ]
        }
    ], [
        {
            "tooltip": "Zoom to fit", "glyphName": "fullscreen", "click": function () {
                fitObjectsToCamera(cavesObjectGroup);

            }
        },
        {
            "tooltip": "Zoom in", "glyphName": "zoom-in", "click": function () {
                zoom(configuration.zoomStep);
            }
        },
        {
            "tooltip": "Zoom out", "glyphName": "zoom-out", "click": function () {
                zoom(-1 * configuration.zoomStep);
            }
        },
        {
            "tooltip": "Plan", "glyphName": "arrow-down", "click": function () {
                currentCamera.position.copy(new THREE.Vector3(C.ORBIT_TARGET.x, C.ORBIT_TARGET.y, C.ORBIT_TARGET.z + 100));
                currentCamera.lookAt(C.ORBIT_TARGET);
                currentCamera.updateMatrix();

                fitObjectsToCamera(cavesObjectGroup);
            }
        },
        {
            "tooltip": "Profile", "glyphName": "arrow-right", "click": function () {
                currentCamera.position.copy(new THREE.Vector3(C.ORBIT_TARGET.x, C.ORBIT_TARGET.y - 100, C.ORBIT_TARGET.z));
                currentCamera.lookAt(C.ORBIT_TARGET);
                currentCamera.updateMatrix();
                fitObjectsToCamera(cavesObjectGroup);
            }
        }
    ]);
    addNavbarClickListener();

}

function zoom(step) {
    const zoomValue = currentCamera.zoom + step;
    if (zoomValue > 0.1) {
        currentCamera.zoom = zoomValue;
        currentCamera.updateProjectionMatrix();
        render();
    }
}

function fitObjectsToCamera(objectGroup) {
    const boundingBox = new THREE.Box3().setFromObject(objectGroup);
    
    const boundingBoxCenter = boundingBox.getCenter(new THREE.Vector3());
    const aspect = window.innerWidth / window.innerHeight;
    const rotation = new THREE.Matrix4().extractRotation(currentCamera.matrix);
    boundingBox.applyMatrix4(rotation);
    const width = boundingBox.max.x - boundingBox.min.x;
    const height = boundingBox.max.y - boundingBox.min.y
    const maxSize = Math.max(width, height);

    configuration.zoomStep = C.FRUSTRUM / maxSize;
    const zoomLevel = Math.min(
        (2 * C.FRUSTRUM * aspect) / width,
        (2 * C.FRUSTRUM) / height,
    );
    currentCamera.zoom = zoomLevel;

    const moveCameraBy = boundingBoxCenter.clone().sub(C.ORBIT_TARGET);
    const oldPosition = currentCamera.position.clone();
    const newCameraPosition = oldPosition.add(moveCameraBy);

    C.ORBIT_TARGET.copy(boundingBoxCenter)
    currentCamera.position.copy(newCameraPosition);
    currentCamera.lookAt(C.ORBIT_TARGET);
    currentCamera.updateProjectionMatrix();
    orbit.target = C.ORBIT_TARGET;
    orbit.update();
    render();
}

function render() {
    if (cavesStationNamesGroup !== undefined && show.stationNames) {
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
    render();
    return [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup];
}

function importPolygonFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const wholeFileInText = event.target.result;
        const cave = I.getCaveFromPolygonFile(wholeFileInText, addToScene);
        caves.push(cave);
        cave.surveys.forEach(s => {
            const [centerLineSegments, splaySegments] = I.getSegments(s.stations, s.shots);
            const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup] = addToScene(s.stations, centerLineSegments, splaySegments);
            cavesObjects.push({ 'cave': cave.name, 'survey': s.name, 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup })
        });
        P.renderSurveyPanel(caves, cavesObjects, show, render);
        fitObjectsToCamera(cavesObjectGroup);
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
            const [stations, shots, centerLineSegments, splaySegments] = I.importCsvFile(results.data);
            const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup] = addToScene(stations, centerLineSegments, splaySegments);
            const caveName = file.name;
            const surveyName = 'polygon';
            const cave = new M.Cave(caveName, [new M.Survey(surveyName, true, stations, shots)], true);
            cavesObjects.push({ 'cave': caveName, 'survey': surveyName, 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup });
            caves.push(cave);
            P.renderSurveyPanel(caves, cavesObjects, show, render);
            fitObjectsToCamera(cavesObjectGroup);
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