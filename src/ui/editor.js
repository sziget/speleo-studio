import * as U from '../utils/utils.js';
import { CaveMetadata, Color, StationAttribute } from '../model.js';
import { AttributesDefinitions } from '../attributes.js';
import { SectionAttribute } from '../model.js';
import { SectionHelper } from '../section.js';
import { randomAlphaNumbericString } from '../utils/utils.js';
import { makeMoveableDraggable, showErrorPanel } from './popups.js';

class Editor {

  constructor(panel, scene, cave, attributeDefs) {
    this.panel = panel;
    this.scene = scene;
    this.cave = cave;
    this.attributeDefs = attributeDefs;
    this.closed = false;
  }

  showAlert(msg, timeoutSec = 5, postAction = () => {}) {
    if (this.table === undefined) return;
    this.table.alert(msg);
    setTimeout(() => {
      this.table.clearAlert();
      postAction();
    }, timeoutSec * 1000);
  }

  attributesEditor(cell, onRendered, success, setValueFn, successFn) {
    const cellValue = cell.getData();
    var editor = document.createElement('input');
    editor.setAttribute('type', 'text');

    editor.style.padding = '0px';
    editor.style.width = '100%';
    editor.style.boxSizing = 'border-box';

    if (cellValue !== undefined) {
      const val = setValueFn(cellValue);
      editor.value = AttributesDefinitions.getAttributesAsString(val);
    }

    //set focus on the select box when the editor is selected (timeout allows for editor to be added to DOM)
    onRendered(function () {
      editor.focus();
      editor.style.css = '100%';
    });

    editor.addEventListener('change', () => successFn(editor.value, cell, success));
    editor.addEventListener('blur', () => successFn(editor.value, cell, success));

    return editor;
  }

  attributeHeaderFilter(headerValue, _rowValue, rowData) {

    let attrs;
    if (rowData.attribute !== undefined) {
      attrs = [rowData.attribute];
    } else if (rowData.attributes !== undefined) {
      attrs = rowData.attributes;
    }
    if (attrs !== undefined) {
      const formatted = AttributesDefinitions.getAttributesAsString(attrs);
      return formatted.includes(headerValue);
    } else {
      return false;
    }
  }

  show() {
    this.panel.style.display = 'block';
  }

  closeEditor() {
    this.closed = true;

    if (this.table !== undefined) {
      this.table.destroy();
      this.table = undefined;
    }

    this.panel.style.display = 'none';
  }

}

class CaveEditor extends Editor {

  constructor(db, options, cave, scene, attributeDefs, panel) {
    super(panel, scene, cave, attributeDefs);
    this.db = db;
    this.options = options;
    this.graph = undefined; // sort of a lazy val
  }

  #emitCaveRenamed(oldName, cave) {
    const event = new CustomEvent('caveRenamed', {
      detail : {
        oldName : oldName,
        cave    : cave
      }
    });
    document.dispatchEvent(event);
  }

  setupPanel() {
    this.panel.innerHTML = '';
    makeMoveableDraggable(
      this.panel,
      `Cave sheet editor: ${this.cave.name}`,
      () => this.closeEditor(),
      (_newWidth, newHeight) => this.table.setHeight(newHeight - 140),
      () => this.table.redraw()
    );
    this.#setupEditor();
    this.#setupStats();
    this.#setupTable();

  }
  #setupEditor() {
    const editorFields = U.node`<div class="editor"></div>`;

    [
      { label: 'Name', id: 'name', field: 'name', type: 'text' },
      { label: 'Settlement', id: 'settlement', fieldSource: 'metadata', field: 'settlement', type: 'text' },
      { label: 'Cataster code', id: 'cataster-code', fieldSource: 'metadata', field: 'catasterCode', type: 'text' },
      {
        label       : 'Date',
        id          : 'date',
        fieldSource : 'metadata',
        field       : 'date',
        type        : 'date',
        parser      : (value) => new Date(value),
        formatter   : (value) => U.formatDateISO(value) // yyyy-mm-dd
      }

    ].forEach((i) => {
      let value = '';
      if (i.fieldSource !== undefined && i.fieldSource === 'metadata' && this.cave.metaData !== undefined) {
        value = this.cave.metaData[i.field];
        if (value !== undefined && i.formatter !== undefined) {
          value = i.formatter(value);
        }
      } else if (i.id === 'name') {
        value = this.cave[i.field];
      }
      const label = U.node`<label for="${i.id}">${i.label}: <input type="${i.type}" id="${i.id}" value="${value}"></label>`;
      label.childNodes[1].onchange = (e) => {
        const newValue = e.target.value;
        if (i.fieldSource === 'metadata') {
          const parser = i.parser === undefined ? (v) => v : i.parser;
          if (this.cave.metaData === undefined) {
            this.cave.metaData = new CaveMetadata();
          }
          this.cave.metaData[i.field] = parser(newValue);
        }

        if (i.id === 'name') {
          if (this.db.getCave(newValue) !== undefined) {
            showErrorPanel(`Cave with name ${newValue} alreay exists, cannot rename!`);
            e.target.value = this.cave.name;
          } else {
            const oldName = this.cave.name;
            this.db.renameCave(oldName, newValue);
            this.#emitCaveRenamed(oldName, this.cave);
          }
        }

      };
      editorFields.appendChild(label);

    });

    this.panel.appendChild(editorFields);

    this.panel.appendChild(U.node`<hr/>`);
  }

  #setupStats() {
    const statFields = U.node`<div class="cave-stats"></div>`;
    const stats = this.cave.getStats();

    [
      { id: 'stations', label: 'Stations', field: 'stations', formatter: (v) => v },
      { id: 'surveys', label: 'Surveys', field: 'surveys', formatter: (v) => v },
      { id: 'isolated', label: 'Isolated surveys', field: 'isolated', formatter: (v) => v },
      { id: 'attributes', label: 'Station attributes', field: 'attributes', formatter: (v) => v },
      { break: true },
      { id: 'length', label: 'Length', field: 'length', formatter: (v) => v.toFixed(2) },
      { id: 'orphanLength', label: 'Length (orphan)', field: 'orphanLength', formatter: (v) => v.toFixed(2) },
      { break: true },
      { id: 'depth', label: 'Depth', field: 'depth', formatter: (v) => v.toFixed(2) },
      { id: 'height', label: 'Height', field: 'height', formatter: (v) => v.toFixed(2) },
      { id: 'vertical', label: 'Vertical extent', field: 'vertical', formatter: (v) => v.toFixed(2) },
      {
        id        : 'vertiicalWithSplays',
        label     : 'Vertical extent (splays)',
        field     : 'vertiicalWithSplays',
        formatter : (v) => v.toFixed(2)
      }

    ].forEach((s) => {
      let node;
      if (s.break) {
        node = U.node`<br>`;
      } else {
        const value = s.formatter(stats[s.field]);
        node = U.node`<span id="${s.id}">${s.label} : ${value}</span>"`;
      }
      statFields.appendChild(node);
    });
    this.panel.appendChild(statFields);

    this.panel.appendChild(U.node`<hr/>`);
  }

  #setupTable() {

    const addRow = document.createElement('button');
    addRow.appendChild(document.createTextNode('Add row'));
    addRow.onclick = () => {
      const sa = new SectionAttribute(
        randomAlphaNumbericString(6),
        undefined,
        undefined,
        this.options.scene.sectionAttributes.color
      );
      this.cave.sectionAttributes.push(sa);
      this.table.addRow(sa);
    };
    this.panel.appendChild(addRow);

    const tableDiv = document.createElement('div');
    tableDiv.setAttribute('id', 'sectionattributes');
    this.panel.appendChild(tableDiv);

    const tickToggle = (ev, cell) => {
      if (!cell.getData().isComplete()) {
        this.showAlert('Section attribute has missing arguments, cannot change visibility!', 4);
        return;
      }

      cell.setValue(!cell.getValue());
      const data = cell.getData();

      if (cell.getValue() === true) {
        this.scene.showSectionAttribute(
          data.id,
          SectionHelper.getSegments(data.section, this.cave.stations),
          data.attribute,
          data.color,
          this.cave.name
        );
      } else {
        this.scene.disposeSectionAttribute(data.id);
      }
    };

    const fromOrToEdited = (cell) => {
      const data = cell.getData();

      // new row
      if (data.section.from === undefined || data.section.to === undefined) {
        return;
      }

      if (data.section.from !== data.section.to) {
        if (this.graph === undefined) {
          this.graph = SectionHelper.getGraph(this.cave);
        }
        const section = SectionHelper.getSection(this.graph, data.section.from, data.section.to);
        if (section !== undefined && section.distance !== 'Infinity') {
          data.section = section;
          cell.getRow().update(data);
          if (data.visible) {
            this.scene.disposeSectionAttribute(data.id);
            this.scene.showSectionAttribute(
              data.id,
              SectionHelper.getSegments(data.section, this.cave.stations),
              data.attribute,
              data.color,
              this.cave.name
            );
          }
        } else {
          this.showAlert(
            `Unable to find path between ${data.section.from} -> ${data.section.to}.<br>Restoring previous value (${cell.getOldValue()}).`,
            7,
            () => {
              cell.setValue(cell.getOldValue());
            }
          );

        }
      } else {
        this.showAlert(
          `From and to cannot be the same (${data.section.from})!<br>Restoring previous value (${cell.getOldValue()}).`,
          6,
          () => {
            cell.setValue(cell.getOldValue());
          }
        );

      }
    };

    const deleteRow = (cell) => {
      const id = cell.getData().id;
      const toDelete = this.cave.sectionAttributes.find((sa) => sa.id === id);

      const indexToDelete = this.cave.sectionAttributes.indexOf(toDelete);
      if (indexToDelete !== -1) {
        this.cave.sectionAttributes.splice(indexToDelete, 1);
      }
      cell.getRow().delete();
    };

    const atrributesFormatter = (cell) => {
      const attribute = cell.getData().attribute;
      if (attribute !== undefined) {
        return AttributesDefinitions.getAttributesAsString([attribute]);
      } else {
        return undefined;
      }
    };

    const successFunc = (value, cell, successCallback) => {
      const result = this.attributeDefs.getAttributesFromString(value);
      if (result.errors.length > 0) {
        this.showAlert(result.errors.join('<br>'), 6);
      } else if (result.attributes.length === 0) {
        this.showAlert('Zero attributes has been parsed!');
      } else if (result.attributes.length > 1) {
        this.showAlert('Only a single attribute is allowed here!');
      } else if (result.attributes.length === 1) {
        cell.getData().attribute = result.attributes[0];
        successCallback(result.attributes[0]);
      }
    };

    const deleteIcon = () => {
      return '<div class="delete-row"></div>';
    };

    const colorIcon = function (cell) {
      const data = cell.getData();
      const color = data.color.hexString();
      const style = `style="background: ${color}"`;
      return `<input type="color" id="color-picker-${data.id}" value="${color}"><label id="color-picker-${data.id}-label" for="color-picker-${data.id}" ${style}></label>`;
    };

    const changeColor = (e, cell) => {
      if (e.target.tagName === 'INPUT') {
        e.target.oninput = (e2) => {
          const newColor = e2.target.value;
          const data = cell.getData();
          data.color = new Color(newColor);
          if (data.visible) {
            this.scene.disposeSectionAttribute(data.id);
            this.scene.showSectionAttribute(
              data.id,
              SectionHelper.getSegments(data.section, this.cave.stations),
              data.attribute,
              data.color,
              this.cave.name
            );
          }
          const label = document.getElementById(e.target.id + '-label');
          label.style.background = newColor;
        };
      }
    };

    this.table = new Tabulator('#sectionattributes', {
      height         : this.panel.style.height - 140,
      autoResize     : false,
      data           : this.cave.sectionAttributes,
      layout         : 'fitColumns',
      validationMode : 'highlight',
      rowHeader      : { formatter: 'rownum', headerSort: false, hozAlign: 'center', resizable: false, frozen: true },
      addRowPos      : 'bottom',

      columns : [
        {
          title      : 'Visible',
          field      : 'visible',
          headerSort : false,
          formatter  : 'tickCross',
          cellClick  : tickToggle
        },
        {
          title      : 'Color',
          formatter  : colorIcon,
          width      : 45,
          headerSort : false,
          cellClick  : (_e, cell) => changeColor(_e, cell)
        },
        {
          title        : 'From',
          field        : 'section.from',
          headerSort   : false,
          editor       : 'list',
          editorParams : { values: [...this.cave.stations.keys()], autocomplete: true },
          validator    : ['required'],
          headerFilter : 'input',
          cellEdited   : fromOrToEdited
        },
        {
          title        : 'To',
          field        : 'section.to',
          headerSort   : false,
          editor       : 'list',
          editorParams : { values: [...this.cave.stations.keys()], autocomplete: true },
          validator    : ['required'],
          headerFilter : 'input',
          cellEdited   : fromOrToEdited
        },
        {
          title      : 'Distance',
          field      : 'section.distance',
          headerSort : false,
          editor     : false,
          formatter  : function (cell) {
            if (cell.getValue() !== undefined) {
              return cell.getValue().toFixed(2);
            } else {
              return '0';
            }
          }
        },
        {
          title            : 'Attribute',
          field            : 'section.attribute',
          headerSort       : false,
          headerFilterFunc : this.attributeHeaderFilter,
          headerFilter     : 'input',
          formatter        : atrributesFormatter,
          editor           : (cell, onRendered, success) =>
            this.attributesEditor(
              cell,
              onRendered,
              success,
              (cv) => (cv.attribute === undefined ? [] : [cv.attribute]),
              successFunc
            )
        },
        {
          formatter  : deleteIcon,
          width      : 40,
          headerSort : false,
          cellClick  : (_e, cell) => deleteRow(cell)
        }
      ]
    });

  }

}

class SurveyEditor extends Editor {

  constructor(cave, survey, scene, attributeDefs, panel) {
    super(panel, scene, cave, attributeDefs);
    this.survey = survey;
    this.table = undefined;
    this.surveyModified = false;
    document.addEventListener('surveyRecalculated', (e) => this.onSurveyRecalculated(e));
  }

  #emitSurveyChanged(attributes) {
    const event = new CustomEvent('surveyChanged', {
      detail : {
        cave       : this.cave,
        survey     : this.survey,
        attributes : attributes
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
      .filter((r) => r.attributes !== undefined && r.attributes.length > 0)
      .flatMap((row) => row.attributes.map((a) => new StationAttribute(row.shot.to, a)));
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

    super.closeEditor();
  }

  #getTableData(survey, stations) {
    return survey.shots.map((sh) => {
      const stationAttributes = survey.attributes
        .filter((a) => a.name === sh.to)
        .map((a) => a.attribute);

      const rowToBe = {
        shot       : sh,
        isOrphan   : survey.orphanShotIds.has(sh.id),
        attributes : stationAttributes
      };
      const fromStation = stations.get(survey.getFromStationName(sh));
      const toStation = stations.get(survey.getToStationName(sh));

      rowToBe.from = fromStation; // not shown in table
      rowToBe.to = toStation; // not shown in table
      return rowToBe;
    });
  }

  setupTable() {

    this.panel.innerHTML = '';
    makeMoveableDraggable(
      this.panel,
      `Survey editor: ${this.survey.name}`,
      () => this.closeEditor(),
      (_newWidth, newHeight) => this.table.setHeight(newHeight - 100),
      () => this.table.redraw()
    );

    [
      { id: 'centerlines', text: 'Hide splays', click: () => this.table.addFilter(showCenter) },
      { id: 'sumCenterLines', text: 'Show orphans', click: () => this.table.addFilter(showOrphans) },
      { id: 'hideorphan', text: 'Hide orphans', click: () => this.table.addFilter(hideOrphans) },
      { id: 'clear-filter', text: 'Clear filters', click: () => this.table.clearFilter() },
      { id: 'update-survey', text: 'Update', click: () => this.requestRecalculation() }
    ].forEach((b) => {
      const button = U.node`<button id="${b.id}">${b.text}</button>`;
      button.onclick = b.click;
      this.panel.appendChild(button);
    });
    this.panel.appendChild(U.node`<div id="surveydata"></div>`);

    const floatPattern = /^[+-]?\d+([.,]\d+)?$/;
    var isFloatNumber = function (_cell, value) {
      return floatPattern.test(value);
    };

    const customValidator = {
      type : isFloatNumber
    };

    const countOrphans = function (_values, data) {
      const cnt = data.filter((v) => v.isOrphan).length;
      return `o: ${cnt}`;
    };

    const countLines = function (_values, data) {
      return data.length;
    };

    const sumCenterLines = function (_values, data) {
      var sumLength = 0;
      data.forEach(function (value) {
        sumLength += value.shot.type === 'center' ? U.parseMyFloat(value.shot.length) : 0;
      });

      return sumLength.toFixed(2);
    };

    var floatAccessor = function (value) {
      return U.parseMyFloat(value);
    };

    function showCenter(data) {
      return data.shot.type === 'center';
    }

    function hideOrphans(data) {
      return !data.isOrphan;
    }

    function showOrphans(data) {
      return data.isOrphan;
    }

    const atrributesFormatter = (cell) => {
      const attrs = cell.getData().attributes;
      if (attrs !== undefined && attrs.length > 0) {
        return AttributesDefinitions.getAttributesAsString(attrs);
      } else {
        return undefined;
      }
    };

    const successFunc = (value, cell, successCallback) => {
      const result = this.attributeDefs.getAttributesFromString(value);
      if (result.errors.length > 0) {
        this.showAlert(result.errors.join('<br>'), 6);
      } else if (result.attributes.length > 0) {
        successCallback(result.attributes);
      }
    };

    this.table = new Tabulator('#surveydata', {
      height         : 300,
      data           : this.#getTableData(this.survey, this.cave.stations),
      layout         : 'fitDataStretch',
      validationMode : 'highlight',
      rowHeader      : { formatter: 'rownum', headerSort: false, hozAlign: 'center', resizable: false, frozen: true },
      rowFormatter   : function (row) {
        const rowData = row.getData();
        if (rowData.isOrphan) {
          row.getElement().style.backgroundColor = '#ff0000';
        }
        if (rowData.type === 'splay') {
          row.getElement().style.backgroundColor = '#012109';
        }
      },
      columns : [
        {
          title        : 'From',
          field        : 'shot.from',
          headerSort   : false,
          editor       : true,
          validator    : ['required'],
          headerFilter : 'input',
          bottomCalc   : countLines
        },
        {
          title        : 'To',
          field        : 'shot.to',
          headerSort   : false,
          editor       : true,
          validator    : ['required'],
          headerFilter : 'input',
          bottomCalc   : countOrphans
        },
        {
          title      : 'Length',
          field      : 'shot.length',
          headerSort : false,
          editor     : true,
          accessor   : floatAccessor,
          validator  : ['required', customValidator],
          bottomCalc : sumCenterLines
        },
        {
          title      : 'Azimuth',
          field      : 'shot.azimuth',
          headerSort : false,
          editor     : true,
          accessor   : floatAccessor,
          validator  : ['required', 'min:-360', 'max:360', customValidator]
        },
        {
          title      : 'Clino',
          field      : 'shot.clino',
          headerSort : false,
          editor     : true,
          accessor   : floatAccessor,
          validator  : ['required', customValidator]
        },
        {
          title            : 'Attributes',
          field            : 'attributes',
          headerFilterFunc : this.attributeHeaderFilter,
          headerFilter     : 'input',
          formatter        : atrributesFormatter,
          editor           : (cell, onRendered, success) =>
            this.attributesEditor(cell, onRendered, success, (cv) => cv.attributes, successFunc),
          headerSort : false
        }
      ]
    });

    this.table.on('dataChanged', () => {
      console.log(' data changed ');
      this.surveyModified = true;
    });

  }
}

export { SurveyEditor, CaveEditor };
