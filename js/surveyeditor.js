import * as U from "./utils.js";

export class SurveyEditor {

    constructor(scene, panel, closeButton, updateButton) {
        this.scene = scene;
        this.caveName = undefined;
        this.surveyName = undefined;
        this.panel = panel;
        this.table = undefined;
        this.surveyModified = false;
        closeButton.addEventListener("click", () => this.closeEditor());
        updateButton.addEventListener("click", () => this.requestRecalculation());
        document.addEventListener('surveyRecalculated', (e) => this.onSurveyRecalculated(e));
    }

    show() {
        this.panel.style.display = "block";
    }

    #emitSurveyChanged() {
        const event = new CustomEvent("surveyChanged", {
            detail: {
                cave: this.caveName,
                survey: this.surveyName
            }
        });
        document.dispatchEvent(event);
    }

    onSurveyRecalculated(e) {
        const caveName = e.detail.cave;
        const surveyName = e.detail.survey;

        if (this.table !== undefined && this.caveName === caveName && this.surveyName === surveyName) {
            const shots = e.detail.shots;
            const orphanShotIds = e.detail.orphanShotIds;
            const data = this.#getTableData(shots, orphanShotIds);
            this.table.replaceData(data);
        }
    }

    requestRecalculation() {
        if (this.surveyModified) {
            this.#emitSurveyChanged();
        }
    }

    closeEditor() {
        //surveydata.innerHTML = '';
        if (this.table !== undefined) {
            this.table.destroy();
            this.table = undefined;
        }
        this.panel.style.display = 'none';
        if (this.surveyModified) {
            this.#emitSurveyChanged();
        }
    }

    #getTableData(shots, orphanShotIds) {
        return shots.map(s => {
            s.isOrphan = orphanShotIds.has(s.id);
            return s;
        });
    }

    setupTable(caveName, surveyName, shots, orphanShotIds) {
        this.caveName = caveName;
        this.surveyName = surveyName;

        const floatPattern = /^[+-]?\d+([.,]\d+)?$/
        var isFloatNumber = function (cell, value, parameters) {
            return floatPattern.test(value);
        }

        const customValidator = {
            type: isFloatNumber
        };

        const countOrphans = function(values, data, calcParams){
            const cnt = data.filter(v => v.isOrphan).length;
            return `orphans: ${cnt}`;
        }

        const sumCenterLines = function(values, data, calcParams){
            var sumLength = 0;
            data.forEach(function(value){
                sumLength += value.type === 'center' ? U.parseMyFloat(value.length) : 0;
            });
        
            return sumLength.toFixed(2);
        }
        

        document.getElementById("hide-splays").addEventListener("click", () => this.table.setFilter("type", "=", "center"));

        document.getElementById("filter-clear").addEventListener("click", () => this.table.clearFilter());

        this.table = new Tabulator("#surveydata", {
            height: 215,
            data: this.#getTableData(shots, orphanShotIds),
            layout: "fitColumns",
            validationMode: "highlight",
            rowHeader: { formatter: "rownum", headerSort: false, hozAlign: "center", resizable: false, frozen: true },
            rowFormatter: function (row) {
                if (row.getData().isOrphan) {
                    row.getElement().style.backgroundColor = "#ff0000";
                }
                if (row.getData().type === 'splay') {
                    row.getElement().style.backgroundColor = "#bcffdb";
                }
            },
            columns: [
                { title: "Id", field: "id", headerSort: false, bottomCalc: "count" },
                { title: "From", field: "from", headerSort: false, editor: true, validator: ["required"], headerFilter: "input", bottomCalc: countOrphans },
                { title: "To", field: "to", headerSort: false, editor: true, validator: ["required"], headerFilter: "input" },
                { title: "Length", field: "length", headerSort: false, editor: true, validator: ["required", customValidator], bottomCalc: sumCenterLines },
                { title: "Azimuth", field: "azimuth", headerSort: false, editor: true, validator: ["required", "min:-360", "max:360", customValidator] },
                { title: "Clino", field: "clino", headerSort: false, editor: true, validator: ["required", customValidator] },
            ],
        });

        this.table.on("dataChanged", (data) => {
            console.log(' data changed ');
            this.surveyModified = true;
        });

    }
}
