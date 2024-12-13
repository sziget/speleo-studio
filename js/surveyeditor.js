export class SurveyEditor {

    constructor(scene, panel, closeButton) {
        this.scene = scene;
        this.caveName = undefined;
        this.surveyName = undefined;
        this.panel = panel;
        this.closeButton = closeButton;
        this.table = undefined;
        this.surveyModified = false;
        closeButton.addEventListener("click", () => this.closeEditor());
    }

    show() {
        this.panel.style.display = "block";
    }

    closeEditor() {
        //surveydata.innerHTML = '';
        if (this.table !== undefined) {
            this.table.destroy();
            this.table = undefined;
        }
        this.panel.style.display = 'none';
        if (this.surveyModified) {
            const event = new CustomEvent("surveyChanged", {
                detail: {
                    cave: this.caveName,
                    survey: this.surveyName
                }
            });
            document.dispatchEvent(event);
        }
    }


    setupTable(caveName, surveyName, shots) {
        this.caveName = caveName;
        this.surveyName = surveyName;

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

        this.table = new Tabulator("#surveydata", {
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

        this.table.on("dataChanged", (data) => {
            console.log(' data changed ');
            this.surveyModified = true;
        });

    }
}
