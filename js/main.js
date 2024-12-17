import * as I from "./import.js";
import { ProjectExplorer, ProjectManager } from "./explorer.js";
import { OPTIONS } from "./config.js";
import { Database } from "./db.js";
import { MyScene } from "./scene.js";
import { SceneInteraction } from "./interactive.js";
import * as MAT from "./materials.js";
import { NavigationBar } from "./navbar.js";
import { SurveyHelper } from "./survey.js";
import { SurveyEditor } from "./surveyeditor.js";
import { AttributesDefinitions, attributeDefintions } from "./attributes.js"
import { showWarningPanel } from "./popups.js";
import { addGui } from "./gui.js";

class Main {

    constructor() {
        this.db = new Database()
        this.options = OPTIONS;
        this.materials = MAT.materials;

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
        this.navbar = new NavigationBar(document.getElementById("navbarcontainer"), this.options, this.myscene);
        this.surveyeditor = new SurveyEditor(this.myscene, this.db, this.attributeDefs, document.getElementById("surveydatapanel"), document.getElementById("surveydatapanel-close"), document.getElementById("surveydatapanel-update"));
        this.explorer = new ProjectExplorer(this.options, this.db, this.myscene, this.surveyeditor);
        this.manager = new ProjectManager(this.db, this.myscene, this.explorer);

        this.gui = addGui(this.options, this.myscene, this.materials, document.getElementById('guicontrols'));
        this.interaction = new SceneInteraction(this.myscene, this.materials, this.myscene.domElement, document.getElementById("getdistance"), document.getElementById("contextmenu"), document.getElementById("infopanel"));

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('cave')) {
            const caveNameUrl = urlParams.get('cave');

            if (caveNameUrl.includes('.cave')) {
                fetch(caveNameUrl).then(data => data.blob()).then(res => this.imporPolygonFromFile(res)).catch(error => console.error(error));
            } else if (caveNameUrl.includes('.csv')) {
                fetch(caveNameUrl).then(data => data.blob()).then(res => this.importCsvFile(res, caveNameUrl)).catch(error => console.error(error));
            }
        } else {
            this.myscene.renderScene();
        }

        document.getElementById('topodroidInput').addEventListener('change', (e) => this.importCsvFile(e.target.files[0]));
        document.getElementById('polygonInput').addEventListener('change', (e) => this.imporPolygonFromFile(e.target.files[0]));

    }

    imporPolygonFromFile(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => this.importPolygon(event.target.result);
            reader.readAsText(file, "iso_8859-2");
        }
    }

    importPolygon(wholeFileInText) {
        const cave = I.getCaveFromPolygonFile(wholeFileInText);
        const colorGradients = SurveyHelper.getColorGradientsForCaves(new Map([[cave.name, cave]]), this.options.scene.caveLines);
        this.addCave(cave, colorGradients.get(cave.name));
    }

    addCave(cave, colorGradients) {
        const cavesReallyFar = Array.from(this.db.caves.values()).reduce((acc, c) => {
            const distanceBetweenCaves = c.startPosition.distanceTo(cave.startPosition);
            if (distanceBetweenCaves > 1000) {
                acc.push(`${c.name} - ${distanceBetweenCaves.toFixed(2)} m`);
                return acc;
            }
        }, []);
        if (cavesReallyFar.length > 0) {
            const message = `Import failed, the cave is too far from previously imported caves: ${cavesReallyFar.join(",")}`;
            showWarningPanel(message, 20);
        } else {
            this.db.caves.set(cave.name, cave);
            cave.surveys.forEach(s => {
                if (s.name === "Laci-zsomboly") {
                    s.attributes.set('1', [this.attributeDefs.createByName("bedding")(90.0, 80, 10, 40)]);
                } else if (s.name === "Fogadalom-ág") {
                    s.attributes.set('Fo19', [this.attributeDefs.createByName("fault")(180.0, 0, 10, 40)]);
                    s.attributes.set('Fo21', [this.attributeDefs.createByName("speleotheme")("a", "b")]);
                }
                const [centerLineSegments, splaySegments] = SurveyHelper.getSegments(s.name, s.stations, s.shots);
                const _3dobjects =
                    this.myscene.addToScene(
                        s.stations,
                        centerLineSegments,
                        splaySegments,
                        true,
                        colorGradients !== undefined ? colorGradients.get(s.name) : undefined
                    );
                this.myscene.addSurvey(cave.name, s.name, _3dobjects);
            });
            this.explorer.addCave(cave);
            this.myscene.fitScene();
        }
    }

    importCsvFile(file, fileName) {
        if (file) {
            Papa.parse(file, {
                header: false,
                comments: "#",
                dynamicTyping: true,
                complete: (results) => {
                    const caveName = (fileName !== undefined) ? fileName : file.name;
                    const cave = I.getCaveFromCsvFile(caveName, results.data);
                    const colorGradients = SurveyHelper.getColorGradientsForCaves(new Map([[caveName, cave]]), this.options.scene.caveLines);
                    this.addCave(cave, colorGradients.get(cave.name));
                },
                error: function (error) {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    }
}

new Main();