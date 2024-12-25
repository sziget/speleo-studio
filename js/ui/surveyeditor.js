import * as U from "../utils/utils.js";
import { StationAttribute } from "../model.js";

class SurveyEditor {

    constructor(scene, db, attributeDefs, panel, closeButton, updateButton) {
        this.scene = scene;
        this.db = db;
        this.attributeDefs = attributeDefs;
        this.panel = panel;
        this.cave = undefined;
        this.survey = undefined;
        this.table = undefined;
        this.surveyModified = false;
        closeButton.addEventListener("click", () => this.closeEditor());
        updateButton.addEventListener("click", () => this.requestRecalculation());
        document.addEventListener('surveyRecalculated', (e) => this.onSurveyRecalculated(e));
    }

    show() {
        this.panel.style.display = "block";
    }

    #emitSurveyChanged(attributes) {
        const event = new CustomEvent("surveyChanged", {
            detail: {
                cave: this.cave,
                survey: this.survey,
                attributes: attributes
            }
        });
        document.dispatchEvent(event);
    }

    onSurveyRecalculated(e) {
        const cave = e.detail.cave;
        const survey = e.detail.survey;

        if (this.table !== undefined && this.cave.name === cave.name && this.survey.name === survey.name) {
            const data = this.#getTableData(survey, cave.stations);
            this.table.replaceData(data);
        }
    }

    #getSurveyAttributesFromTable() {
        return this.table.getData()
            .filter(r => r.attributes !== undefined && r.attributes.length > 0)
            .flatMap(row => row.attributes.map(a => new StationAttribute(row.shot.to, a)));
    }

    requestRecalculation() {
        if (this.surveyModified) {
            const attributes = this.#getSurveyAttributesFromTable();
            this.#emitSurveyChanged(attributes);
            this.surveyModified = false;
        }
    }

    closeEditor() {

        if (this.surveyModified) {
            const attributes = this.#getSurveyAttributesFromTable();
            this.#emitSurveyChanged(attributes);
            this.surveyModified = false;
        }

        if (this.table !== undefined) {
            this.table.destroy();
            this.table = undefined;
        }
        this.panel.style.display = 'none';
    }

    #getTableData(survey, stations) {
        return survey.shots.map(sh => {
            const stationAttributes = survey.attributes
                .filter(a => a.stationName === sh.to)
                .map(a => a.attribute);

            const rowToBe = {
                shot: sh,
                isOrphan: survey.orphanShotIds.has(sh.id),
                attributes: stationAttributes
            }
            const fromStation = stations.get(survey.getFromStationName(sh));
            const toStation = stations.get(survey.getToStationName(sh));

            rowToBe.from = fromStation; // not shown in table
            rowToBe.to = toStation; // not shown in table
            return rowToBe;
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


    setupTable(survey, cave) {
        this.cave = cave;
        this.survey = survey;

        const floatPattern = /^[+-]?\d+([.,]\d+)?$/
        var isFloatNumber = function (cell, value, parameters) {
            return floatPattern.test(value);
        }

        const customValidator = {
            type: isFloatNumber
        };

        const countOrphans = function (values, data, calcParams) {
            const cnt = data.filter(v => v.isOrphan).length;
            return `o: ${cnt}`;
        }

        const countLines = function (values, data, calcParams) {
            return data.length;
        }

        const sumCenterLines = function (values, data, calcParams) {
            var sumLength = 0;
            data.forEach(function (value) {
                sumLength += value.type === 'center' ? U.parseMyFloat(value.length) : 0;
            });

            return sumLength.toFixed(2);
        }

        var floatAccessor = function (value, data, type, params, column, row) {
            return U.parseMyFloat(value);
        }

        function showCenter(data, filterParams){
            return data.shot.type === "center";
        }

        function hideOrphans(data, filterParams){
            return !data.isOrphan;
        }

        function showOrphans(data, filterParams){
            return data.isOrphan;
        }




        document.getElementById("centerlines").addEventListener("click", () => this.table.addFilter(showCenter));
        document.getElementById("showorphan").addEventListener("click", () => this.table.addFilter(showOrphans));
        document.getElementById("hideorphan").addEventListener("click", () => this.table.addFilter(hideOrphans));

        document.getElementById("filter-clear").addEventListener("click", () => this.table.clearFilter());

        const atrributesFormatter = (cell, formatterParams, onRendered) => {
            const attrs = cell.getData().attributes;
            if (attrs !== undefined && attrs.length > 0) {
                return this.getAttributesAsString(attrs);
            } else {
                return undefined;
            }
        }

        const decimal2Formatter = (field) => (cell, formatterParams, onRendered) => {
            return cell.getData()[field].toFixed(2);
        }

        this.table = new Tabulator("#surveydata", {
            height: 215,
            data: this.#getTableData(survey, cave.stations),
            layout: "fitDataStretch",
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
                // { title: "Id", field: "id", headerSort: false, bottomCalc: countLines },
                { title: "From", field: "shot.from", headerSort: false, editor: true, validator: ["required"], headerFilter: "input", bottomCalc: countLines },
                { title: "To", field: "shot.to", headerSort: false, editor: true, validator: ["required"], headerFilter: "input", bottomCalc: countOrphans },
                { title: "Length", field: "shot.length", headerSort: false, editor: true, accessor: floatAccessor, validator: ["required", customValidator], bottomCalc: sumCenterLines },
                { title: "Azimuth", field: "shot.azimuth", headerSort: false, editor: true, accessor: floatAccessor, validator: ["required", "min:-360", "max:360", customValidator] },
                { title: "Clino", field: "shot.clino", headerSort: false, editor: true, accessor: floatAccessor, validator: ["required", customValidator] },
                // { title: "X", field: "x", headerSort: false, editor: false, formatter: decimal2Formatter('x') },
                // { title: "Y", field: "y", headerSort: false, editor: false, formatter: decimal2Formatter('y') },
                // { title: "Z", field: "z", headerSort: false, editor: false, formatter: decimal2Formatter('z') },
                { title: "Attributes", field: "attributes", formatter: atrributesFormatter, editor: (cell, onRendered, success, cancel, editorParams) => this.attributesEditor(cell, onRendered, success, cancel, editorParams), headerSort: false }
            ],
        });

        this.table.on("dataChanged", (data) => {
            console.log(' data changed ');
            this.surveyModified = true;
        });

    }
}

export { SurveyEditor };
