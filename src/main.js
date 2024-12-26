import { Database } from "./db.js";
import { MyScene } from "./scene/scene.js";
import { PlySurfaceImporter, PolygonImporter, TopodroidImporter, JsonImporter } from "./io/import.js";
import { SceneInteraction } from "./interactive.js";
import { OPTIONS } from "./config.js";
import { MATERIALS } from "./materials.js";
import { ProjectExplorer, ProjectManager } from "./ui/explorer.js";
import { NavigationBar } from "./ui/navbar.js";
import { Footer } from "./ui/footer.js";
import { addGui } from "./ui/controls.js";
import { SurveyEditor } from "./ui/surveyeditor.js";
import { AttributesDefinitions, attributeDefintions } from "./attributes.js";

class Main {

    constructor() {
        const db = new Database();
        const options = OPTIONS;
        const materials = MATERIALS;
        const attributeDefs = new AttributesDefinitions(attributeDefintions);
        const scene = new MyScene(options, db, materials);
        new NavigationBar(db, document.getElementById("navbarcontainer"), options, scene);
        const footer = new Footer(document.getElementById('footer'));
        const surveyeditor = new SurveyEditor(scene, db, attributeDefs, document.getElementById("surveydatapanel"), document.getElementById("surveydatapanel-close"), document.getElementById("surveydatapanel-update"));
        const explorer = new ProjectExplorer(options, db, scene, surveyeditor, document.querySelector('#tree-panel'));
        new ProjectManager(db, options, scene, explorer);
        addGui(options, scene, materials, document.getElementById('guicontrols'));
        new SceneInteraction(options, footer, scene, materials, scene.domElement, document.getElementById("getdistance"), document.getElementById("contextmenu"), document.getElementById("infopanel"));
        this.scene = scene;
        this.importers = {
            topodroid: new TopodroidImporter(db, options, scene, explorer),
            polygon: new PolygonImporter(db, options, scene, explorer),
            json: new JsonImporter(db, options, scene, explorer, attributeDefs),
            ply: new PlySurfaceImporter(db, options, scene)
        };

        this.setupEventListeners();
        this.loadCaveFromUrl();
    }

    setupEventListeners() {
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.getElementById('topodroidInput').addEventListener('change', (e) => this.importers.topodroid.importFile(e.target.files[0]));
        document.getElementById('polygonInput').addEventListener('change', (e) => this.importers.polygon.importFile(e.target.files[0]));
        document.getElementById('jsonInput').addEventListener('change', (e) => this.importers.json.importFile(e.target.files[0]));
        document.getElementById('plyInput').addEventListener('change', (e) => this.importers.ply.importFile(e.target.files[0]));
    }

    loadCaveFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('cave')) {
            const caveNameUrl = urlParams.get('cave');
            if (caveNameUrl.includes('.cave')) {
                fetch(caveNameUrl).then(data => data.blob()).then(res => this.importers.polygon.importFile(res)).catch(error => console.error(error));
            } else if (caveNameUrl.includes('.csv')) {
                fetch(caveNameUrl).then(data => data.blob()).then(res => this.importers.topodroid.importFile(res, caveNameUrl)).catch(error => console.error(error));
            } else if (caveNameUrl.includes('.json')) {
                fetch(caveNameUrl).then(data => data.blob()).then(res => this.importers.json.importFile(res)).catch(error => console.error(error));
            }
        } else {
            this.scene.renderScene();
        }
    }
}

export { Main };