import * as U from "./utils.js";

export class SurveyEditor {

    constructor(scene, db, attributeDefs, panel, closeButton, updateButton) {
        this.scene = scene;
        this.db = db;
        this.attributeDefs = attributeDefs;
        this.panel = panel;
        this.caveName = undefined;
        this.surveyName = undefined;
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
            const attributes = e.detail.attributes;
            const orphanShotIds = e.detail.orphanShotIds;
            const data = this.#getTableData(shots, orphanShotIds, attributes);
            this.table.replaceData(data);
        }
    }

    requestRecalculation() {
        if (this.surveyModified) {
            this.#emitSurveyChanged();
        }
    }

    closeEditor() {
        if (this.table !== undefined) {
            this.table.destroy();
            this.table = undefined;
        }
        this.panel.style.display = 'none';
        if (this.surveyModified) {
            this.#emitSurveyChanged();
        }
    }

    #getTableData(shots, orphanShotIds, attributes) {
        return shots.map(s => {
            s.isOrphan = orphanShotIds.has(s.id);
            s.attributes = attributes.has(s.to) ? attributes.get(s.to) : undefined;
            return s;
        });
    }

    getAttributesAsString(attrs) {
        return attrs.map(a => {
            const paramNames = Object.keys(a.params);
            const paramValues = paramNames.map(n => a[n]).join(',')
            return `${a.name}(${paramValues})`
        }).join('|');
    }

    attributesEditor(cell, onRendered, success, cancel, editorParams) {
        //cell - the cell component for the editable cell
        //onRendered - function to call when the editor has been rendered
        //success - function to call to pass thesuccessfully updated value to Tabulator
        //cancel - function to call to abort the edit and return to a normal cell
        //editorParams - params object passed into the editorParams column definition property

        //create and style editor
        const cellValue = cell.getValue();
        var editor = document.createElement("input");

        editor.setAttribute("type", "text");

        //create and style input
        editor.style.padding = "0px";
        editor.style.width = "100%";
        editor.style.boxSizing = "border-box";

        if (cellValue !== undefined && cellValue.length > 0) {
            //Set value of editor to the current value of the cell
            editor.value = this.getAttributesAsString(cellValue);
        }

        //set focus on the select box when the editor is selected (timeout allows for editor to be added to DOM)
        onRendered(function () {
            editor.focus();
            editor.style.css = "100%";
        });
        const metaPattern = /((?<name>[A-Za-z]+)(\((?<params>[A-Za-z0-9., ":{}]+)\))?)/g
        //when the value has been set, trigger the cell to update
        const attributeDefs = this.attributeDefs;

        function successFunc() {
            const editedAttrs = []
            for (const match of editor.value.matchAll(metaPattern)) {
                const a = attributeDefs.createByName(match.groups.name);
                const params = match.groups.params.split(',');
                editedAttrs.push(a(...params));

            }
            success(editedAttrs);
        }

        editor.addEventListener("change", () => successFunc());
        editor.addEventListener("blur", () => successFunc());

        //return the editor element
        return editor;
    }


    setupTable(caveName, surveyName, shots, orphanShotIds, attributes) {
        this.caveName = caveName;
        this.surveyName = surveyName;

        const floatPattern = /^[+-]?\d+([.,]\d+)?$/
        var isFloatNumber = function (cell, value, parameters) {
            return floatPattern.test(value);
        }

        const customValidator = {
            type: isFloatNumber
        };

        const countOrphans = function (values, data, calcParams) {
            const cnt = data.filter(v => v.isOrphan).length;
            return `orphans: ${cnt}`;
        }

        const sumCenterLines = function (values, data, calcParams) {
            var sumLength = 0;
            data.forEach(function (value) {
                sumLength += value.type === 'center' ? U.parseMyFloat(value.length) : 0;
            });

            return sumLength.toFixed(2);
        }


        document.getElementById("hide-splays").addEventListener("click", () => this.table.setFilter("type", "=", "center"));

        document.getElementById("filter-clear").addEventListener("click", () => this.table.clearFilter());

        const atrributesFormatter = (cell, formatterParams, onRendered) => {
            const attrs = cell.getData().attributes;
            if (attrs !== undefined && attrs.length > 0) {
                return this.getAttributesAsString(attrs);
            } else {
                return undefined;
            }
        }

        this.table = new Tabulator("#surveydata", {
            height: 215,
            data: this.#getTableData(shots, orphanShotIds, attributes),
            layout: "fitDataTable",
            validationMode: "highlight",
            rowHeader: { formatter: "rownum", headerSort: false, hozAlign: "center", resizable: false, frozen: true },
            rowFormatter: function (row) {
                const rowData = row.getData();
                if (rowData.isOrphan) {
                    row.getElement().style.backgroundColor = "#ff0000";
                }
                if (rowData.type === 'splay') {
                    row.getElement().style.backgroundColor = "#012109";
                }
            },
            columns: [
                { title: "Id", field: "id", headerSort: false, bottomCalc: "count" },
                { title: "From", field: "from", headerSort: false, editor: true, validator: ["required"], headerFilter: "input", bottomCalc: countOrphans },
                { title: "To", field: "to", headerSort: false, editor: true, validator: ["required"], headerFilter: "input" },
                { title: "Length", field: "length", headerSort: false, editor: true, validator: ["required", customValidator], bottomCalc: sumCenterLines },
                { title: "Azimuth", field: "azimuth", headerSort: false, editor: true, validator: ["required", "min:-360", "max:360", customValidator] },
                { title: "Clino", field: "clino", headerSort: false, editor: true, validator: ["required", customValidator] },
                { title: "Attributes", field: "attributes", formatter: atrributesFormatter, editor: (cell, onRendered, success, cancel, editorParams) => this.attributesEditor(cell, onRendered, success, cancel, editorParams), headerSort: false }
            ],
        });

        this.table.on("dataChanged", (data) => {
            console.log(' data changed ');
            this.surveyModified = true;
        });

    }
}
