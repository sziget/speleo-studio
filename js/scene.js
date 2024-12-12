import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as C from "./constants.js";
import * as U from "./utils.js";
import * as MAT from "./materials.js";

export class MyScene {

    constructor(options, canvas) {
        this.options = options;
        this.caveObjects = new Map();
        this.caveObject3DGroup = new THREE.Group();
        this.domElement = canvas;
        this.stationFont = undefined;
        const loader = new FontLoader();
        loader.load('fonts/helvetiker_regular.typeface.json', (font) => this.setFont(font));
        this.sceneRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.domElement });
        this.sceneRenderer.setPixelRatio(window.devicePixelRatio);
        this.sceneRenderer.setSize(window.innerWidth, window.innerHeight);

        const aspect = window.innerWidth / window.innerHeight;

        //this.cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
        this.cameraOrtho = new THREE.OrthographicCamera(- C.FRUSTRUM * aspect, C.FRUSTRUM * aspect, C.FRUSTRUM, - C.FRUSTRUM, -1000, 3000);
        this.currentCamera = this.cameraOrtho;
        this.setCameraPosition(0, 0, 100);

        this.orbit = new OrbitControls(this.currentCamera, this.domElement);
        this.orbit.update();
        this.orbit.addEventListener('change', () => this.renderScene());

        this.threejsScene = new THREE.Scene();
        const grid = new THREE.GridHelper(100, 10, 0x888888, 0x444444).rotateX(U.degreesToRads(90));
        this.threejsScene.add(grid);
        this.threejsScene.add(this.caveObject3DGroup);

        this.raycaster = new THREE.Raycaster();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setFont(font) {
        this.stationFont = font;
    }


    setCameraPosition(x, y, z) {
        this.currentCamera.position.set(x, y, z);
        this.currentCamera.lookAt(C.ORBIT_TARGET);
        this.currentCamera.updateMatrix();
    }

    setSurveyVisibility(cave, survey, value) {
        const entry = this.caveObjects.get(cave).get(survey);
        entry.centerLines.visible = value && this.options.scene.show.polygon;
        entry.centerLines.hidden = !value; // hidden is a custom attribute set by me, used in setObjectsVisibility
        entry.splays.visible = value && this.options.scene.show.splays;
        entry.splays.hidden = !value;
        entry.stationNames.visible = value && this.options.scene.show.stationNames;
        entry.stationNames.hidden = !value;
        entry.stationSpheres.visible = value && this.options.scene.show.spheres;
        entry.stationSpheres.hidden = !value;
        this.renderScene();
    }

    setObjectsVisibility(fieldName, val) {
        const entries = this.#getObjectsFlattened();
        entries.forEach(e => {
            e[fieldName].visible = !e.centerLines.hidden && val;
        });
        this.renderScene();
    }

    changeStationSpheresRadius() {
        const spheres = this.getAllStationSpheres();
        const geometry = new THREE.SphereGeometry(this.options.scene.stationSphereRadius / 10.0, 5, 5);
        spheres.forEach(s => s.geometry = geometry);
        this.renderScene();
    }

    disposeSurvey(cave, survey) {
        const e = this.caveObjects.get(cave).get(survey);
        e.centerLines.geometry.dispose();
        e.stationNames.children.forEach(c => c.geometry.dispose());
        e.stationNames.clear();
        e.stationSpheres.children.forEach(c => c.geometry.dispose()); // all stations spheres use the same geometry
        e.stationSpheres.clear();
        e.group.clear();
        this.threejsScene.remove(e.group);
    }

    addSurvey(cave, survey, entry) {
        if (!this.caveObjects.has(cave)) {
            this.caveObjects.set(cave, new Map());
        }
        this.caveObjects.get(cave).set(survey, entry);

    }

    getAllStationSpheres() {
        const entries = Array.from(this.#getObjectsFlattened());
        return entries.flatMap(e => e.stationSpheres.children);

    }

    getBoundingClientRect() {
        return this.domElement.getBoundingClientRect();
    }

    getIntersectedStationSpheres(pointer) {
        const spheres = this.getAllStationSpheres();
        this.raycaster.setFromCamera(pointer, this.currentCamera);
        return this.raycaster.intersectObjects(spheres);
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;

        //this.cameraPersp.aspect = aspect;
        //this.cameraPersp.updateProjectionMatrix();

        this.cameraOrtho.left = this.cameraOrtho.bottom * aspect;
        this.cameraOrtho.right = this.cameraOrtho.top * aspect;
        this.cameraOrtho.updateProjectionMatrix();

        this.sceneRenderer.setSize(window.innerWidth, window.innerHeight);
        this.renderScene();

    }

    zoomWithStep(step) {
        const zoomValue = this.currentCamera.zoom + step;
        if (zoomValue > 0.1) {
            this.currentCamera.zoom = zoomValue;
            this.currentCamera.updateProjectionMatrix();
            this.renderScene();
        }
    }

    fitScene() {
        this.fitObjectsToCamera(this.caveObject3DGroup);
    }

    fitObjectsToCamera(object3DGroup) {
        const boundingBox = new THREE.Box3().setFromObject(object3DGroup);

        const boundingBoxCenter = boundingBox.getCenter(new THREE.Vector3());
        const aspect = window.innerWidth / window.innerHeight;
        const rotation = new THREE.Matrix4().extractRotation(this.currentCamera.matrix);
        boundingBox.applyMatrix4(rotation);
        const width = boundingBox.max.x - boundingBox.min.x;
        const height = boundingBox.max.y - boundingBox.min.y
        const maxSize = Math.max(width, height);

        this.options.scene.zoomStep = C.FRUSTRUM / maxSize;
        const zoomLevel = Math.min(
            (2 * C.FRUSTRUM * aspect) / width,
            (2 * C.FRUSTRUM) / height,
        );
        this.currentCamera.zoom = zoomLevel;

        const moveCameraBy = boundingBoxCenter.clone().sub(C.ORBIT_TARGET);
        const oldPosition = this.currentCamera.position.clone();
        const newCameraPosition = oldPosition.add(moveCameraBy);

        C.ORBIT_TARGET.copy(boundingBoxCenter)
        this.currentCamera.position.copy(newCameraPosition);
        this.currentCamera.lookAt(C.ORBIT_TARGET);
        this.currentCamera.updateProjectionMatrix();
        this.orbit.target = C.ORBIT_TARGET;
        this.orbit.update();
        this.renderScene();
    }

    lookAtPlan() {
        this.setCameraPosition(C.ORBIT_TARGET.x, C.ORBIT_TARGET.y, C.ORBIT_TARGET.z + 100);
        this.fitObjectsToCamera(this.caveObject3DGroup);
    }

    lookAtProfile() {
        this.setCameraPosition(C.ORBIT_TARGET.x, C.ORBIT_TARGET.y - 100, C.ORBIT_TARGET.z);
        this.fitObjectsToCamera(this.caveObject3DGroup);
    }

    renderScene() {
        // if (cavesStationNamesGroup !== undefined && OPTIONS.scene.show.stationNames) {
        //     cavesStationNamesGroup.forEach(
        //         group => group.children.forEach(fontMesh =>
        //             fontMesh.lookAt(currentCamera.position)
        //         )
        //     );
        // }
        this.sceneRenderer.render(this.threejsScene, this.currentCamera);
    }

    #getObjectsFlattened() {
        return this.caveObjects.values().flatMap(c => Array.from(c.values()));
    }

    addObjectToScene(object) {
        this.threejsScene.add(object);
    }

    removeFromScene(object) {
        this.threejsScene.remove(object);
    }

    addStationName(stationName, position, fontGroup) {
        const shortName = stationName.split("@")[0]
        const textShape = this.stationFont.generateShapes(shortName, 0.7);
        const textGeometry = new THREE.ShapeGeometry(textShape);
        textGeometry.computeBoundingBox();

        const xMid = - 0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
        textGeometry.translate(xMid, 0, 0);

        const textMesh = new THREE.Mesh(textGeometry, MAT.materials.text);
        textMesh.lookAt(this.currentCamera.position)
        textMesh.position.x = position.x;
        textMesh.position.y = position.y;
        textMesh.position.z = position.z;
        fontGroup.add(textMesh);
    }

    addStationSpheres(stationName, position, sphereGroup, geometry) {
        const sphere = new THREE.Mesh(geometry, MAT.materials.sphere);
        sphere.position.x = position.x;
        sphere.position.y = position.y;
        sphere.position.z = position.z;
        sphere.name = stationName;
        sphereGroup.add(sphere);
    }

    addToScene(stations, polygonSegments, splaySegments) {
        const geometryStations = new LineSegmentsGeometry();
        geometryStations.setPositions(polygonSegments);
        const lineSegmentsPolygon = new LineSegments2(geometryStations, MAT.materials.polygon);
        lineSegmentsPolygon.visible = this.options.scene.show.polygon;

        const splaysGeometry = new LineSegmentsGeometry();
        splaysGeometry.setPositions(splaySegments);
        const lineSegmentsSplays = new LineSegments2(splaysGeometry, MAT.materials.splay);
        lineSegmentsSplays.visible = this.options.scene.show.splays;
        const group = new THREE.Group();

        group.add(lineSegmentsPolygon);
        group.add(lineSegmentsSplays);

        const stationNamesGroup = new THREE.Group();
        const stationSpheresGroup = new THREE.Group();
        for (const [stationName, stationPosition] of stations) {
            this.addStationName(stationName, stationPosition, stationNamesGroup);
            this.addStationSpheres(stationName, stationPosition, stationSpheresGroup, new THREE.SphereGeometry(this.options.scene.stationSphereRadius / 10.0, 5, 5));
        }

        stationNamesGroup.visible = this.options.scene.show.stationNames;
        stationSpheresGroup.visible = this.options.scene.show.spheres;

        group.add(stationNamesGroup);
        group.add(stationSpheresGroup);
        this.caveObject3DGroup.add(group);
        this.renderScene();
        return [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup, group];
    }


}