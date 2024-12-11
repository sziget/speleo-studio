import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import * as C from "./constants.js";
import * as I from "./import.js";
import * as M from "./model.js";
import { ProjectExplorer } from "./explorer.js";
import { OPTIONS } from "./config.js";
import { Database } from "./db.js";
import { MyScene } from "./scene.js";
import * as U from "./utils.js";
import * as A from "./interactive.js";
import * as MAT from "./materials.js";
import { buildNavbar, addNavbarClickListener } from "./navbar.js";

import { addGui } from "./gui.js";


    
let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, orbit, gui;

let db = new Database()
let explorer;
let myscene;

let stationFont;


let cavesObjectGroup = new THREE.Group();
const cavesModified = new Set();
let cavesStationNamesGroup;


init();
render();

document.getElementById("surveydatapanel-close").addEventListener("click", function () {

    //surveydata.innerHTML = '';
    surveydatapanel.style.display = 'none';

    if (cavesModified.size > 0) {
        cavesModified.forEach(cn => {
            const editedCave = db.caves.find(c => c.name === cn);
            let surveyStations = new Map();
            editedCave.surveys.entries().forEach(([index, es]) => {
                es.isolated = false;
                const startName = index === 0 ? es.shots[0].from : undefined;
                const startPosition = index === 0 ? new M.Vector(0, 0, 0) : undefined;
                const stations = I.calculateSurveyStations(es.shots, surveyStations, [], startName, startPosition);
                es.isolated = (stations.size === 0);
                es.stations = stations;
                stations.forEach((v, k) => surveyStations.set(k, v));
                const [clSegments, splaySegments] = I.getSegments(stations, es.shots);
                myscene.disposeSurvey(cn, es.name);
                const [cl, sl, sn, ss, group] = addToScene(stations, clSegments, splaySegments);
                myscene.addSurvey(cn, es.name, {'id': U.randomAlphaNumbericString(5), 'centerLines': cl, 'splays': sl, 'stationNames': sn, 'stationSpheres': ss, 'group': group });

            });
        });
        cavesModified.clear();
        myscene.renderScene();
    }
});

function getAllStationSpheres() {
    return myscene.getAllStationSpheres();

}

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
                getAllStationSpheres(),
                currentCamera,
                MAT.materials,
                render
            );
        }, false);
    renderer.domElement.addEventListener('mousedown',
        function (event) {
            A.onMouseDown(
                event,
                getAllStationSpheres(),
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

    scene.add(cavesObjectGroup);

    const loader = new FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        stationFont = font;
    });

    cavesStationNamesGroup = [];

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

    myscene = new MyScene(OPTIONS, scene, render);
    explorer = new ProjectExplorer(OPTIONS, db, myscene, cavesModified);
    gui = addGui(OPTIONS, myscene, MAT.materials);
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

    OPTIONS.scene.zoomStep = C.FRUSTRUM / maxSize;
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
    if (cavesStationNamesGroup !== undefined && OPTIONS.scene.show.stationNames) {
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

function addStationSpheres(stationName, position, sphereGroup, geometry) {
    //const geometry = new THREE.SphereGeometry(OPTIONS.scene.stationSphereRadius / 10.0, 5, 5);
    const sphere = new THREE.Mesh(geometry, MAT.materials.sphere);
    sphere.position.x = position.x;
    sphere.position.y = position.y;
    sphere.position.z = position.z;
    sphere.name = stationName;
    sphereGroup.add(sphere);
}

function addToScene(stations, polygonSegments, splaySegments) {
    const geometryStations = new LineSegmentsGeometry();
    geometryStations.setPositions(polygonSegments);
    const lineSegmentsPolygon = new LineSegments2(geometryStations, MAT.materials.polygon);
    lineSegmentsPolygon.visible = OPTIONS.scene.show.polygon;

    const splaysGeometry = new LineSegmentsGeometry();
    splaysGeometry.setPositions(splaySegments);
    const lineSegmentsSplays = new LineSegments2(splaysGeometry, MAT.materials.splay);
    lineSegmentsSplays.visible = OPTIONS.scene.show.splays;
    const group = new THREE.Group();

    group.add(lineSegmentsPolygon);
    group.add(lineSegmentsSplays);

    const stationNamesGroup = new THREE.Group();
    const stationSpheresGroup = new THREE.Group();
    for (const [stationName, stationPosition] of stations) {
        addStationName(stationName, stationPosition, stationNamesGroup);
        addStationSpheres(stationName, stationPosition, stationSpheresGroup,new THREE.SphereGeometry(OPTIONS.scene.stationSphereRadius / 10.0, 5, 5));
    }

    stationNamesGroup.visible = OPTIONS.scene.show.stationNames;
    stationSpheresGroup.visible = OPTIONS.scene.show.spheres;

    group.add(stationNamesGroup);
    group.add(stationSpheresGroup);
    cavesObjectGroup.add(group);

    render();
    return [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup, group];
}

function importPolygonFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const wholeFileInText = event.target.result;
        const cave = I.getCaveFromPolygonFile(wholeFileInText);
        db.caves.push(cave);
        cave.surveys.forEach(s => {
            const [centerLineSegments, splaySegments] = I.getSegments(s.stations, s.shots);
            const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup, group] = addToScene(s.stations, centerLineSegments, splaySegments);
            myscene.addSurvey(cave.name, s.name, { 'id': U.randomAlphaNumbericString(5), 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup, 'group': group });
        });
        explorer.renderTrees();
        fitObjectsToCamera(cavesObjectGroup);
    };
    reader.readAsText(file, "iso_8859-2");
}

function importCsvFile(file) {
    Papa.parse(file, {
        header: false,
        comments: "#",
        dynamicTyping: true,
        complete: function (results) {
            const [stations, shots, centerLineSegments, splaySegments] = I.importCsvFile(results.data);
            const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup, group] = addToScene(stations, centerLineSegments, splaySegments);
            const caveName = file.name;
            const surveyName = 'polygon';
            const cave = new M.Cave(caveName, [new M.Survey(surveyName, true, stations, shots)], true);
            db.caves.push(cave);
            myscene.addSurvey(caveName, surveyName, {'id': U.randomAlphaNumbericString(5), 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup, 'group': group });
            explorer.renderTrees();
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