import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import { SurveyHelper } from "./survey.js";
import * as C from "./constants.js";
import { Database } from "./db.js";
import * as MAT from "./materials.js";
import * as U from "./utils.js";

export class MyScene {

    /**
     * A class that creates the 3D scene that makes user interactions and scene modifications (camera position, add/remove 3D objects) possible
     * 
     * @param {Map<String, Map>} options - The project options
     * @param {Database} db - The database of the application, containing caves and other infomations
     * @param {*} - Collection of line and geometry materials
     */
    constructor(options, db, materials) {
        this.options = options;
        this.db = db;
        this.materials = materials;
        this.caveObjects = new Map();
        this.caveObject3DGroup = new THREE.Group();
        this.stationFont = undefined;
        const loader = new FontLoader();
        loader.load('fonts/helvetiker_regular.typeface.json', (font) => this.setFont(font));
        this.sceneRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.sceneRenderer.setPixelRatio(window.devicePixelRatio);
        this.sceneRenderer.setSize(window.innerWidth, window.innerHeight);
        this.domElement = this.sceneRenderer.domElement; // auto generate canvas
        document.body.appendChild(this.domElement);

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

        this.boundingBox = undefined;
        this.planeMeshes = new Map();

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

    toogleBoundingBox() {
        if (this.boundingBox === undefined) {
            const bb = new THREE.Box3();
            this.caveObjects.forEach(c => {
                c.forEach(e => {
                    if (e.centerLines.visible) {
                        bb.expandByObject(e.centerLines);
                    }
                    if (e.splays) {
                        bb.expandByObject(e.splays);
                    }
                });
            });
            const boundingBoxHelper = new THREE.Box3Helper(bb, 0xffffff);
            this.boundingBox = boundingBoxHelper;
            this.threejsScene.add(boundingBoxHelper);
        } else {
            this.threejsScene.remove(this.boundingBox);
            this.boundingBox.dispose();
            this.boundingBox = undefined;
        }
        this.renderScene();
    }

    showPlaneFor(attributeName) {
        const planes = [];
        this.db.getAllSurveys().forEach(s => {
            s.getSurveyAttributesByName(attributeName).forEach(([position, attributes]) => {
                const firstAttribute = attributes[0];
                const geometry = new THREE.PlaneGeometry(firstAttribute.width, firstAttribute.height, 10, 10);
                const plane = new THREE.Mesh(geometry, MAT.materials.planes.get(attributeName));
                plane.position.set(0, 0, 0);
                const dir = U.normal(U.degreesToRads(firstAttribute.azimuth), U.degreesToRads(firstAttribute.dip));
                plane.lookAt(dir.x, dir.y, dir.z);
                const v = new THREE.Vector3(position.x, position.y, position.z);
                plane.position.copy(v);
                planes.push(plane);
                this.threejsScene.add(plane);
            })
        });

        this.planeMeshes.set(attributeName, planes); // even set if planes is emptry
        this.renderScene();
    }

    rotateCenterLineColor() {
        const config = this.options.scene.caveLines.color.mode;
        const index = config.choices.indexOf(config.value);

        if (index >= 0 && index < config.choices.length - 1) {
            config.value = config.choices[index + 1];
        } else {
            config.value = config.choices[0];
        }

        switch (config.value) {
            case 'gradientByZ':
                const colors = SurveyHelper.getColorGradientsForCaves(this.db.caves, this.options.scene.caveLines);
                this.caveObjects.forEach((surveyEntrires, caveName) => {
                    surveyEntrires.forEach((e, surveyName) => {
                        e['centerLines'].material = this.materials.whiteLine;
                        const surveyColors = colors.get(caveName).get(surveyName);
                        e['centerLines'].geometry.setColors(surveyColors);
                    });
                });
                break;
            case 'global':
                const entries = this.#getObjectsFlattened();
                entries.forEach(e => {
                    e['centerLines'].material = this.materials.centerLine;
                    e['centerLines'].geometry.setColors([]);
                });
                break;
            default: throw new Error(`unknown configuration for cave line colors: ${config.value}`);
        }
        this.renderScene();
    }


    disposePlaneFor(attributeName, shouldDelete = true) {
        const planes = this.planeMeshes.get(attributeName);
        planes.forEach(p => {
            p.geometry.dispose();
            this.threejsScene.remove(p);
        });
        if (shouldDelete) {
            this.planeMeshes.delete(attributeName);
        }

        this.renderScene();
    }

    tooglePlaneFor(attributeName) {
        if (!this.planeMeshes.has(attributeName)) {
            this.showPlaneFor(attributeName);
        } else {
            this.disposePlaneFor(attributeName);
        }

    }

    updateVisiblePlanes() {
        this.planeMeshes.keys().forEach((k) => this.disposePlaneFor(k, false));
        this.planeMeshes.keys().forEach((k) => this.showPlaneFor(k));
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

    addToScene(stations, polygonSegments, splaySegments, visibility, colorGradients) {
        const geometryStations = new LineSegmentsGeometry();
        geometryStations.setPositions(polygonSegments);
        let lineMat;
        if (colorGradients !== undefined && colorGradients.length > 0) {
            geometryStations.setColors(colorGradients);
            lineMat = this.materials.whiteLine;
            if (lineMat.linewidth === 0) {
                lineMat.linewidth = this.materials.centerLine.linewidth;
            }
        } else {
            lineMat = this.materials.centerLine
        }

        const lineSegmentsPolygon = new LineSegments2(geometryStations, lineMat);
        lineSegmentsPolygon.visible = visibility && this.options.scene.show.polygon;

        const splaysGeometry = new LineSegmentsGeometry();
        splaysGeometry.setPositions(splaySegments);
        const lineSegmentsSplays = new LineSegments2(splaysGeometry, MAT.materials.splay);
        lineSegmentsSplays.visible = visibility && this.options.scene.show.splays;
        const group = new THREE.Group();

        group.add(lineSegmentsPolygon);
        group.add(lineSegmentsSplays);

        const stationNamesGroup = new THREE.Group();
        const stationSpheresGroup = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(this.options.scene.stationSphereRadius / 10.0, 5, 5);
        for (const [stationName, stationPosition] of stations) {
            this.addStationName(stationName, stationPosition, stationNamesGroup);
            this.addStationSpheres(stationName, stationPosition, stationSpheresGroup, sphereGeo);
        }

        stationNamesGroup.visible = visibility && this.options.scene.show.stationNames;
        stationSpheresGroup.visible = visibility && this.options.scene.show.spheres;

        group.add(stationNamesGroup);
        group.add(stationSpheresGroup);
        this.caveObject3DGroup.add(group);
        this.renderScene();
        return [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup, group];
    }

    disposeSurvey(caveName, surveyName) {
        const e = this.caveObjects.get(caveName).get(surveyName);
        this.#disposeSurveyObjects(e);
    }

    #disposeSurveyObjects(e) {
        e.centerLines.geometry.dispose();
        e.splays.geometry.dispose();
        e.stationNames.children.forEach(c => c.geometry.dispose());
        e.stationNames.clear();
        e.stationSpheres.children.forEach(c => c.geometry.dispose()); // all stations spheres use the same geometry
        e.stationSpheres.clear();
        e.group.clear();
        this.threejsScene.remove(e.group);
    }


    disposeCave(caveName) {
        const cave = this.caveObjects.get(caveName);
        cave.forEach(s => this.#disposeSurveyObjects(s));
    }


}