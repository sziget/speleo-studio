import { ProjectExplorer, ProjectManager } from "./explorer.js";
import { OPTIONS } from "./config.js";
import { Database } from "./db.js";
import { MyScene } from "./scene/scene.js";
import { PolygonImporter, TopodroidImporter, JsonImporter } from "./import.js";
import { SceneInteraction } from "./interactive.js";
import { materials as MAT } from "./materials.js";
import { NavigationBar } from "./navbar.js";
import { Footer } from "./footer.js";
import { SurveyEditor } from "./surveyeditor.js";
import { AttributesDefinitions, attributeDefintions } from "./attributes.js"
import { addGui } from "./gui.js";
import { PlySurfaceImporter } from "./import.js";


class Main {

    constructor() {
        this.db = new Database()
        this.options = OPTIONS;
        this.materials = MAT;

        if (document.addEventListener) {
            document.addEventListener('contextmenu', function (e) {
                e.preventDefault();
            }, false);
        } else {
            document.attachEvent('oncontextmenu', function () {
                window.event.returnValue = false;
            });
        }
        this.attributeDefs = new AttributesDefinitions(attributeDefintions);
        this.myscene = new MyScene(this.options, this.db, this.materials);
        this.navbar = new NavigationBar(this.db, document.getElementById("navbarcontainer"), this.options, this.myscene);
        this.footer = new Footer(document.getElementById('footer'));
        this.surveyeditor = new SurveyEditor(this.myscene, this.db, this.attributeDefs, document.getElementById("surveydatapanel"), document.getElementById("surveydatapanel-close"), document.getElementById("surveydatapanel-update"));
        this.explorer = new ProjectExplorer(this.options, this.db, this.myscene, this.surveyeditor, document.querySelector('#tree-panel'));
        this.manager = new ProjectManager(this.db, this.options, this.myscene, this.explorer);

        this.gui = addGui(this.options, this.myscene, this.materials, document.getElementById('guicontrols'));
        this.interaction = new SceneInteraction(this.options, this.footer, this.myscene, this.materials, this.myscene.domElement, document.getElementById("getdistance"), document.getElementById("contextmenu"), document.getElementById("infopanel"));

        this.importers = {
            topodroid: new TopodroidImporter(this.db, this.options, this.myscene, this.explorer),
            polygon: new PolygonImporter(this.db, this.options, this.myscene, this.explorer),
            json: new JsonImporter(this.db, this.options, this.myscene, this.explorer, this.attributeDefs),
            ply: new PlySurfaceImporter(this.db, this.options, this.myscene)
        }
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
            this.myscene.renderScene();
        }

        document.getElementById('topodroidInput').addEventListener('change', (e) => this.importers.topodroid.importFile(e.target.files[0]));
        document.getElementById('polygonInput').addEventListener('change', (e) => this.importers.polygon.importFile(e.target.files[0]));
        document.getElementById('jsonInput').addEventListener('change', (e) => this.importers.json.importFile(e.target.files[0]));
        document.getElementById('plyInput').addEventListener('change', (e) => this.importers.ply.importFile(e.target.files[0]));
    }
}

new Main(); //TODO: do this somewhere in index.html