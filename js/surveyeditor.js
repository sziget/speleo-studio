import { SurveyHelper } from "./survey.js";
import * as U from "./utils.js";

export class SurveyEditor {

    constructor(scene, db, panel, closeButton) {
        this.scene = scene;
        this.db = db;
        this.panel = panel;
        this.closeButton = closeButton;
        this.cavesModified = new Set();
        closeButton.addEventListener("click", () => this.closeEditor());
    }

    show() {
        this.panel.style.display = "block";
    }

    closeEditor() {
        //surveydata.innerHTML = '';
        this.panel.style.display = 'none';
        this.recalculateCaves(this.db.caves);
    }

    recalculateCave(cave) {
        let surveyStations = new Map();
        cave.surveys.entries().forEach(([index, es]) => {
            SurveyHelper.recalculateSurvey(index, es, surveyStations);
            const [clSegments, splaySegments] = SurveyHelper.getSegments(es.stations, es.shots);
            this.scene.disposeSurvey(cave.name, es.name);
            const [cl, sl, sn, ss, group] = this.scene.addToScene(es.stations, clSegments, splaySegments, cave.visible && es.visible);
            this.scene.addSurvey(cave.name, es.name, { 'id': U.randomAlphaNumbericString(5), 'centerLines': cl, 'splays': sl, 'stationNames': sn, 'stationSpheres': ss, 'group': group });
        });
    }

    recalculateCaves(caves) {
        caves.forEach(c => {
            if (this.cavesModified.has(c.name)) {
                this.recalculateCave(c)
            }
        });
        this.cavesModified.clear();
        this.scene.renderScene();
    }

    setupTable(cave, survey, shots) {

        const floatPattern = /^[+-]?\d+([.,]\d+)?$/
        var isFloatNumber = function (cell, value, parameters) {
            return floatPattern.test(value);
        }

        const customValidator = {
            type: isFloatNumber
        };

        document.getElementById("hide-splays").addEventListener("click", function () {
            table.setFilter("type", "=", "center");
        });

        document.getElementById("filter-clear").addEventListener("click", function () {
            table.clearFilter();
        });

        var table = new Tabulator("#surveydata", {
            height: 215,
            data: shots,
            layout: "fitColumns",
            validationMode: "highlight",
            rowHeader: { formatter: "rownum", headerSort: false, hozAlign: "center", resizable: false, frozen: true },
            rowFormatter: function (row) {
                if (row.getData().type === 'splay') {
                    row.getElement().style.backgroundColor = "#bcffdb";
                }
            },
            columns: [
                { title: "Id", field: "id", headerSort: false },
                { title: "From", field: "from", headerSort: false, editor: true, validator: ["required"], headerFilter: "input" },
                { title: "To", field: "to", headerSort: false, editor: true, validator: ["required"], headerFilter: "input" },
                { title: "Length", field: "length", headerSort: false, editor: true, validator: ["required", customValidator] },
                { title: "Azimuth", field: "azimuth", headerSort: false, editor: true, validator: ["required", "min:-360", "max:360", customValidator] },
                { title: "Clino", field: "clino", headerSort: false, editor: true, validator: ["required", customValidator] },
            ],
        });

        table.on("dataChanged", (data) => {
            console.log(' data changed ');
            this.cavesModified.add(cave);
        });

    }
}
