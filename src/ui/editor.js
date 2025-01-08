import * as U from '../utils/utils.js';
import { CaveMetadata, Color, StationAttribute } from '../model.js';
import { AttributesDefinitions } from '../attributes.js';
import { SectionAttribute, Shot } from '../model.js';
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

  floatFormatter(defaultValue = '0') {
    return (cell) => {
      if (cell.getValue() !== undefined) {
        return cell.getValue().toFixed(2);
      } else {
        return defaultValue;
      }
    };
  }

  getContextMenu() {
    return [
      {
        label  : '<span class="delete-row"></span><span>Delete row<span/> ',
        action : function (e, row) {
          row.delete();
        }
      },
      {
        label  : '<span class="add-row"></span><span>Add row above<span/> ',
        action : (e, row) => {
          const newRow = this.getEmptyRow();
          row.getTable().addRow(newRow, true, row.getIndex());
        }
      },
      {
        label  : '<span class="add-row"></span><span>Add row below<span/> ',
        action : (e, row) => {
          const newRow = this.getEmptyRow();
          row.getTable().addRow(newRow, false, row.getIndex());
        }
      }
    ];
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
          formatter  : this.floatFormatter('0')
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

  #emitSurveyChanged() {
    const event = new CustomEvent('surveyChanged', {
      detail : {
        cave   : this.cave,
        survey : this.survey
      }
    });
    document.dispatchEvent(event);
  }

  onSurveyRecalculated(e) {
    const cave = e.detail.cave;
    const survey = e.detail.survey;

    if (this.table !== undefined && this.cave.name === cave.name && this.survey.name === survey.name) {
      const tableRows = this.#getTableData(this.survey, this.cave.stations);
      const invalidShotIdsArray = tableRows
        .filter((r) => ['invalid', 'incomplete'].includes(r.status))
        .map((x) => x.id);
      const invalidShotIds = new Set(invalidShotIdsArray);
      if (invalidShotIds.symmetricDifference(this.survey.invalidShotIds).size > 0) {
        throw new Error(
          `Invalid shot ids do not match for survey '${[...this.survey.invalidShotIds].join(',')}' and rows '${invalidShotIdsArray.join(',')}'`
        );
      }
      if (invalidShotIds.size > 0 || survey.orphanShotIds.size > 0) {
        let invalidMessage = '';
        if (invalidShotIds.size > 0) {
          invalidMessage = `${invalidShotIds.size} row(s) are invalid: ${invalidShotIdsArray.slice(0, 15).join(',')}<br>`;
        }
        let orphanMessage = '';
        if (survey.orphanShotIds.size > 0) {
          const first15Ids = [...survey.orphanShotIds.values()].slice(0, 15);
          orphanMessage = `${survey.orphanShotIds.size} row(s) are orphan: ${first15Ids.join(',')}<br>`;
        }
        this.showAlert(`${invalidMessage}${orphanMessage}Check warning icon for details.`, 7);
      }

      this.table.replaceData(tableRows);
    }
  }

  #getSurveyAttributesFromTable() {
    return this.table.getData()
      .filter((r) => r.attributes !== undefined && r.attributes.length > 0)
      .flatMap((row) => row.attributes.map((a) => new StationAttribute(row.to, a)));
  }

  updateShots() {
    this.survey.updateShots(this.getNewShots());
  }

  getNewShots() {
    return this.table.getData().map((r) => new Shot(r.id, r.type, r.from, r.to, r.length, r.azimuth, r.clino));
  }

  validateSurvey(showAlert = true) {
    const rowsToUpdated = this.getShotValidationUpdates(this.table.getData());
    rowsToUpdated.forEach((e) => this.table.updateData([e]));
    const badRows = rowsToUpdated.filter((r) => ['invalid', 'incomplete'].includes(r.status)).map((r) => r.id + 1);
    if (badRows.length > 0 && showAlert) {
      this.showAlert(
        `${badRows.length} row(s) with the following ids are invalid: ${badRows.slice(0, 15)}<br>Click on the warning icon for details.`,
        4
      );
    }

  }

  getShotValidationUpdates(data) {
    const rowsToUpdated = [];

    data.forEach((r) => {
      const shot = new Shot(r.id, r.type, r.from, r.to, r.length, r.azimuth, r.clino);
      const emptyFields = shot.getEmptyFields();
      const oldStatus = r.status;
      let validationErrors = [];
      if (emptyFields.length > 0) {
        const newRow = { ...r };
        newRow.status = 'incomplete';
        newRow.message = `Shot with id ${shot.id + 1} has missing fields: ${emptyFields.join(',')}`;
        rowsToUpdated.push(newRow);
      } else {
        validationErrors = shot.validate();
        if (validationErrors.length > 0) {
          const newRow = { ...r };
          newRow.status = 'invalid';
          newRow.message = `Shot with id ${shot.id + 1} is invalid: ${validationErrors.join('<br>')}`;
          rowsToUpdated.push(newRow);
        }
      }
      if (['invalid', 'incomplete'].includes(oldStatus) && emptyFields.length === 0 && validationErrors.length === 0) {
        const newRow = { ...r };
        newRow.status = 'ok';
        newRow.message = undefined;
        rowsToUpdated.push(newRow);
      }

    });
    return rowsToUpdated;
  }

  requestRecalculation() {
    if (this.surveyModified) {
      this.updateShots();
      const attributes = this.#getSurveyAttributesFromTable();
      this.survey.attributes = attributes;
      this.#emitSurveyChanged();
      this.surveyModified = false;
    }
  }

  updateSurvey() {
    this.requestRecalculation();
  }

  closeEditor() {
    this.requestRecalculation();
    super.closeEditor();
  }

  #getTableData(survey, stations) {
    const rows = survey.shots.map((sh) => {
      const stationAttributes = survey.attributes
        .filter((a) => a.name === sh.to)
        .map((a) => a.attribute);
      const toStation = stations.get(survey.getToStationName(sh));

      const rowToBe = {
        id         : sh.id,
        from       : sh.from,
        to         : sh.to,
        length     : sh.length,
        azimuth    : sh.azimuth,
        clino      : sh.clino,
        type       : sh.type,
        status     : 'ok',
        message    : 'No errors',
        attributes : stationAttributes,
        x          : toStation?.position?.x,
        y          : toStation?.position?.y,
        z          : toStation?.position?.z
      };

      return rowToBe;
    });
    survey.orphanShotIds.forEach((id) => {
      const row = rows[rows.findIndex((r) => r.id === id)];
      row.status = 'orphan';
      row.message = 'Row is orphan';
    });
    const rowsToUpdate = this.getShotValidationUpdates(rows);
    rowsToUpdate.forEach((u) => (rows[rows.findIndex((r) => r.id === u.id)] = u));

    return rows;
  }

  getEmptyRow() {
    const id = Math.max(...this.table.getData().map((r) => r.id));

    return {
      id         : id + 1,
      from       : undefined,
      to         : undefined,
      length     : undefined,
      azimuth    : undefined,
      clino      : undefined,
      type       : undefined,
      status     : 'incomplete',
      message    : 'Shot is newly created',
      attributes : [],
      x          : undefined,
      y          : undefined,
      z          : undefined
    };

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
      { break: true },
      { id: 'validate-shots', text: 'Validate shots', click: () => this.validateSurvey() },
      { id: 'update-survey', text: 'Update survey', click: () => this.updateSurvey() },
      { id: 'add-row', text: 'Add row to bottom', click: () => this.table.addRow(this.getEmptyRow()) },
      {
        id    : 'delete-row',
        text  : 'Delete active rows',
        click : () => {
          var ranges = this.table.getRanges();
          ranges.forEach((r) => {
            const rows = r.getRows();
            rows.forEach((r) => r.delete());
            r.remove();
          });

        }
      }

    ].forEach((b) => {
      if (b.break === true) {
        this.panel.appendChild(document.createElement('br'));
      } else {
        const button = U.node`<button id="${b.id}">${b.text}</button>`;
        button.onclick = b.click;
        this.panel.appendChild(button);
      }
    });
    this.panel.appendChild(U.node`<div id="surveydata"></div>`);

    const floatPattern = /^[+-]?\d+([.,]\d+)?$/;
    var isFloatNumber = function (_cell, value) {
      return floatPattern.test(value);
    };

    const customValidator = {
      type : isFloatNumber
    };

    const countBadRows = function (_values, data) {
      const cnt = data.filter((v) => v.status !== 'ok').length;
      return `${cnt}`;
    };

    const countLines = function (_values, data) {
      return data.length;
    };

    const sumCenterLines = function (_values, data) {
      var sumLength = 0;
      data.forEach((value) => {
        if (value !== undefined && value.length !== undefined) {
          sumLength += value.type === 'center' ? U.parseMyFloat(value.length) : 0;
        }
      });

      return sumLength.toFixed(2);
    };

    var floatAccessor = function (value) {
      if (value === undefined) {
        return undefined;
      } else if (floatPattern.test(value)) {
        return U.parseMyFloat(value);
      } else {
        return value;
      }
    };

    const statusIcon = (cell) => {
      const data = cell.getData();
      if (data.status === 'ok') {
        return '<div class="ok-row"></div>';
      } else {
        return '<div class="warning-row"></div>';
      }
    };

    const typeIcon = (cell) => {
      const data = cell.getData();
      if (data.type === 'center') {
        return '<div class="center-row"></div>';
      } else if (data.type === 'splay') {
        return '<div class="splay-row"></div>';
      }
    };

    const typeEdited = (cell) => {
      cell.getRow().reformat();
    };

    function showCenter(data) {
      return data.type === 'center';
    }

    function hideOrphans(data) {
      return data.status !== 'orphan';
    }

    function showOrphans(data) {
      return data.status === 'orphan';
    }

    const attributesToClipboard = (attributes) => {
      const formatted = AttributesDefinitions.getAttributesAsString(attributes);
      return formatted;
    };

    const clipboardFormatter = (cell) => {
      const attrs = cell.getData().attributes;
      if (Array.isArray(attrs) && attrs.length > 0) {
        return AttributesDefinitions.getAttributesAsString(attrs);
      } else {
        return '';
      }
    };

    const attributesFromClipboard = (value) => {
      if (value === undefined || typeof value !== 'string' || value.length === 0) {
        return [];
      }
      const result = this.attributeDefs.getAttributesFromString(value);
      if (result.errors.length > 0) {
        this.showAlert(result.errors.join('<br>'), 6);
      } else if (result.attributes.length > 0) {
        return result.attributes;
      }
    };

    const atrributesFormatter = (cell) => {
      const attrs = cell.getData().attributes;
      if (attrs === undefined) {
        return undefined;
      }

      if (Array.isArray(attrs) && attrs.length > 0) {
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
      height                    : 300,
      reactiveData              : true,
      data                      : this.#getTableData(this.survey, this.cave.stations),
      layout                    : 'fitDataStretch',
      validationMode            : 'highlight',
      //enable range selection
      selectableRange           : 1,
      selectableRangeColumns    : true,
      selectableRangeRows       : true,
      selectableRangeClearCells : true,

      //change edit trigger mode to make cell navigation smoother
      editTriggerEvent : 'dblclick',

      //configure clipboard to allow copy and paste of range format data
      clipboard           : true,
      clipboardCopyStyled : false,
      clipboardCopyConfig : {
        rowHeaders    : false,
        columnHeaders : false,
        columnCalcs   : false
      },
      clipboardCopyRowRange : 'range',
      clipboardPasteParser  : 'range',
      clipboardPasteAction  : 'range',

      rowContextMenu : this.getContextMenu(),
      rowHeader      : {
        formatter : 'rownum',
        hozAlign  : 'center',
        resizable : false,
        frozen    : true,
        editor    : false,
        cssClass  : 'range-header-col'
      },
      rowFormatter : function (row) {
        const rowData = row.getData();

        if (rowData.status === 'orphan') {
          row.getElement().style.backgroundColor = '#7d4928';
        } else if (rowData.status === 'ok') {
          if (rowData.type === 'splay') {
            row.getElement().style.backgroundColor = '#012109';
          } else {
            row.getElement().style.backgroundColor = '';
          }
        } else {
          //invalid, incomplete
          row.getElement().style.backgroundColor = '#b99922';
        }
      },
      columnDefaults : {
        headerSort     : false,
        headerHozAlign : 'center',
        resizable      : 'header'
      },
      columns : [
        {
          width      : 25,
          title      : '',
          field      : 'status',
          editor     : false,
          formatter  : statusIcon,
          clickPopup : function (x, cell) {
            const message = cell.getData().message;
            return message === undefined ? 'No errors' : message;
          },
          validator  : ['required'],
          bottomCalc : countBadRows
        },
        {
          width        : 25,
          title        : '',
          field        : 'type',
          editor       : 'list',
          editorParams : { values: ['center', 'splay'] },
          formatter    : typeIcon,
          cellEdited   : typeEdited,
          validator    : ['required']
        },
        {
          title        : 'From',
          field        : 'from',
          editor       : true,
          validator    : ['required'],
          headerFilter : 'input',
          bottomCalc   : countLines
        },
        {
          title        : 'To',
          field        : 'to',
          editor       : true,
          validator    : ['required'],
          headerFilter : 'input'
        },
        {
          title      : 'Length',
          field      : 'length',
          editor     : true,
          accessor   : floatAccessor,
          validator  : ['required', 'min:0', customValidator],
          bottomCalc : sumCenterLines
        },
        {
          title     : 'Azimuth',
          field     : 'azimuth',
          editor    : true,
          accessor  : floatAccessor,
          validator : ['required', 'min:-360', 'max:360', customValidator]
        },
        {
          title     : 'Clino',
          field     : 'clino',
          editor    : true,
          accessor  : floatAccessor,
          validator : ['required', 'min:-90', 'max:90', customValidator]
        },
        {
          title            : 'X',
          field            : 'x',
          mutatorClipboard : floatAccessor,
          formatter        : this.floatFormatter(''),
          editor           : false
        },
        {
          title            : 'Y',
          field            : 'y',
          editor           : false,
          mutatorClipboard : floatAccessor,
          formatter        : this.floatFormatter('')
        },
        {
          title            : 'Z',
          field            : 'z',
          editor           : false,
          mutatorClipboard : floatAccessor,
          formatter        : this.floatFormatter('')
        },
        {
          title              : 'Attributes',
          field              : 'attributes',
          headerFilterFunc   : this.attributeHeaderFilter,
          headerFilter       : 'input',
          formatter          : atrributesFormatter,
          accessorClipboard  : attributesToClipboard,
          mutatorClipboard   : attributesFromClipboard,
          formatterClipboard : clipboardFormatter,
          editor             : (cell, onRendered, success) =>
            this.attributesEditor(cell, onRendered, success, (cv) => cv.attributes, successFunc)
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
