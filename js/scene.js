import * as THREE from 'three';

export class MyScene {
    constructor(options, threejsScene, renderFnTmp) {
        this.options = options;
        this.scene = threejsScene;
        this.caveObjects = new Map();
        this.renderFnTmp = renderFnTmp;
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
        const geometry = new THREE.SphereGeometry(this.options.scene.stationSphereRadius / 10.0 , 5, 5 );
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
        this.scene.remove(e.group);
    }

    addSurvey(cave, survey, entry) {
        if (!this.caveObjects.has(cave)) {
            this.caveObjects.set(cave, new Map());
        }
        this.caveObjects.get(cave).set(survey, entry);

    }

    getAllStationSpheres() {
        const entries = Array.from(this.#getObjectsFlattened());
        return entries.flatMap(e =>  e.stationSpheres.children);
        
    }

    renderScene() {
        this.renderFnTmp();
    }

    #getObjectsFlattened() {
        return this.caveObjects.values().flatMap(c => Array.from(c.values()));
    }


}