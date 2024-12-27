import { classNames } from '../../dependencies/classnames.js';
import { tag } from '../../dependencies//html5-tag.js';
import { escapeHtml } from '../../dependencies//escape-html.js';
import * as U from '../utils/utils.js';
import { SurveyHelper } from '../survey.js';

class ProjectManager {

  /**
   * Creates a new project manager that is used on survey updates
   * @param {Database} db - The project database containing caves and surveys
   * @param {MyScene} scene - The 3D scene
   * @param {ProjectExplorer} explorer - The project explorer that displays caves and surveys in a tree view
   */
  constructor(db, options, scene, explorer) {
    this.db = db;
    this.options = options;
    this.scene = scene;
    this.explorer = explorer;
    document.addEventListener('surveyChanged', (e) => this.onSurveyChanged(e));
    document.addEventListener('surveyDeleted', (e) => this.onSurveyDeleted(e));
    document.addEventListener('caveDeleted', (e) => this.onCaveDeleted(e));
  }

  onSurveyChanged(e) {
    const cave = e.detail.cave;
    const survey = e.detail.survey;
    const attributes = e.detail.attributes;
    cave.surveys.find((s) => s.name === survey.name).attributes = attributes;
    this.recalculateCave(cave);
    this.scene.renderScene();
    this.explorer.updateCave(cave);
  }

  onSurveyDeleted(e) {
    const caveName = e.detail.cave;
    const surveyName = e.detail.survey;
    this.scene.disposeSurvey(caveName, surveyName);
    const cave = this.db.caves.get(caveName);
    this.recalculateCave(cave);
    this.scene.renderScene();
    this.explorer.deleteSurvey(caveName, surveyName);
    this.explorer.updateCave(cave);
  }

  onCaveDeleted(e) {
    const caveName = e.detail.cave;
    this.scene.disposeCave(caveName);
    this.scene.deleteCave(caveName);
    this.scene.renderScene();
    this.explorer.deleteCave(caveName);
  }

  recalculateCave(cave) {
    let caveStations = new Map();
    const lOptions = this.options.scene.caveLines;
    const colorGradients = SurveyHelper.getColorGradients(cave, lOptions);

    cave.surveys.entries().forEach(([index, es]) => {
      SurveyHelper.recalculateSurvey(index, es, caveStations, cave.aliases);
      this.#emitSurveyRecalculated(cave, es);
      const [clSegments, splaySegments] = SurveyHelper.getSegments(es, caveStations);
      this.scene.disposeSurvey(cave.name, es.name);
      const _3dObjects = this.scene.addToScene(
        es.name,
        caveStations,
        clSegments,
        splaySegments,
        cave.visible && es.visible,
        colorGradients.get(es.name)
      );
      this.scene.deleteSurvey(cave.name, es.name);
      this.scene.addSurvey(cave.name, es.name, _3dObjects);
    });
    this.scene.updateVisiblePlanes();
    this.scene.fitScene();
  }

  #emitSurveyRecalculated(cave, survey) {
    const event = new CustomEvent('surveyRecalculated', {
      detail : {
        cave   : cave,
        survey : survey
      }
    });
    document.dispatchEvent(event);
  }

}

class ProjectExplorer {

  constructor(options, db, scene, surveyeditor, treeNode) {
    this.options = options;
    this.db = db;
    this.scene = scene;
    this.trees = new Map();
    this.surveyeditor = surveyeditor;
    this.treeNode = treeNode;
    this.itree = undefined;
  }

  deleteSurvey(caveName, surveyName) {
    const caveNode = this.itree.getChildNodes().find((n) => n.name === caveName);
    const surveyNode = this.itree.getChildNodes(caveNode).find((n) => n.name === surveyName);
    this.itree.removeNode(surveyNode);
  }

  deleteCave(caveName) {
    const caveNode = this.itree.getChildNodes().find((n) => n.name === caveName);
    this.itree.removeNode(caveNode);
  }

  updateCave(cave) {
    const caveNode = this.itree.getChildNodes().find((n) => n.name === cave.name);
    const data = this.transformCave(cave);
    this.itree.updateNode(caveNode, data);
  }

  initializeTree(data) {
    this.itree = new InfiniteTree({
      el          : this.treeNode,
      data        : data,
      autoOpen    : true,
      rowRenderer : this.treeRenderer,
      scene       : this.scene
    });
    this.itree.on('click', this.click(this.itree));
  }

  transformCave(cave) {
    const mapSurvey = (cave, survey) => {
      return {
        id           : U.randomAlphaNumbericString(8),
        name         : survey.name,
        loadOnDemand : true,
        state        : { checked: survey.visible, nodeType: 'survey', cave: cave, survey: survey }
      };
    };
    const mapCave = (cave) => {
      return {
        id           : U.randomAlphaNumbericString(8),
        name         : cave.name,
        children     : cave.surveys.map((s) => mapSurvey(cave, s)),
        loadOnDemand : true,
        state        : { checked: cave.visible, nodeType: 'cave', cave: cave }
      };
    };
    return mapCave(cave);
  }

  addCave(cave) {
    const data = this.transformCave(cave);

    if (this.itree === undefined) {
      this.initializeTree(data);
    } else {
      this.itree.appendChildNode(data);
    }
  }

  click = (tree) => (event) => {
    const currentNode = tree.getNodeFromPoint(event.clientX, event.clientY);
    if (!currentNode) {
      return;
    }
    const state = currentNode.state;
    if (event.target.className === 'checkbox') {
      event.stopPropagation();
      const value = !state.checked;

      if (state.nodeType === 'survey') {
        state.survey.visible = value;
        this.scene.setSurveyVisibility(state.cave.name, state.survey.name, value);
      } else if (state.nodeType === 'cave') {
        const cave = state.cave;
        cave.visible = value;
        cave.surveys.forEach((survey) => {
          survey.visible = value;
          this.scene.setSurveyVisibility(cave.name, survey.name, value);
        });
      }

      tree.checkNode(currentNode);
      return;
    } else if (event.target.id === 'edit') {
      this.surveyeditor.show();
      this.surveyeditor.setupTable(state.survey, state.cave);
    } else if (event.target.id === 'delete') {
      if (state.nodeType === 'survey') {
        this.db.deleteSurvey(state.cave.name, state.survey.name);
      } else if (state.nodeType === 'cave') {
        this.db.deleteCave(state.cave.name);
      }
    }
  };

  treeRenderer(node, treeOptions) {
    const { id, name, loadOnDemand = false, children, state, props = {} } = node;
    const droppable = treeOptions.droppable && props.droppable;
    const { depth, open, path, total, selected = false, filtered, checked } = state;
    const childrenLength = Object.keys(children).length;
    const more = node.hasChildren();

    const isolatedSurvey = state.nodeType === 'survey' && state.survey.isolated === true;

    if (filtered === false) {
      return;
    }

    let togglerContent = '';
    if (!more && loadOnDemand) {
      togglerContent = tag(
        'i',
        {
          class : classNames('infinite-tree-right-arrow')
        },
        ''
      );
    }
    if (more && open) {
      togglerContent = tag(
        'i',
        {
          class : classNames('infinite-tree-down-arrow')
        },
        ''
      );
    }
    if (more && !open) {
      togglerContent = tag(
        'i',
        {
          class : classNames('infinite-tree-right-arrow')
        },
        ''
      );
    }
    if (state.expanding && !state.loading) {
      togglerContent = tag(
        'i',
        {
          class : classNames('glyphicon', 'glyphicon-refresh', 'rotating')
        },
        ''
      );
    }
    if (state.collapsing) {
      // TODO
    }
    const toggler = tag(
      'a',
      {
        class : (() => {
          if (!more && loadOnDemand) {
            return classNames(treeOptions.togglerClass, 'infinite-tree-closed');
          }
          if (more && open) {
            return classNames(treeOptions.togglerClass);
          }
          if (more && !open) {
            return classNames(treeOptions.togglerClass, 'infinite-tree-closed');
          }
          return '';
        })()
      },
      togglerContent
    );

    const icon = tag(
      'i',
      {
        class : classNames(
          //   'infinite-tree-folder-icon',
          //   { 'glyphicon-folder-open': more && open },
          //   { 'glyphicon-folder-close': more && !open },
          //   { 'glyphicon-file': !more && !isolatedSurvey },
          //   { 'glyphicon-exclamation-sign': !more && isolatedSurvey },
          { 'infinite-tree-isolated': isolatedSurvey }
        )
      },
      ''
    );

    const title = tag(
      'span',
      {
        class : classNames('infinite-tree-title', { 'infinite-tree-isolated': isolatedSurvey })
      },
      escapeHtml(name)
    );

    const checkbox = tag('input', {
      type           : 'checkbox',
      checked        : checked,
      class          : classNames('checkbox'),
      'data-checked' : checked,
      id             : 'checkboxi'
    });

    const label = '<label for="checkboxi"></label>';

    const deleteIcon = tag(
      'span',
      {
        id    : 'delete',
        class : classNames('infinite-tree-delete')
      },
      ''
    );

    const editIcon = tag(
      'span',
      {
        id    : 'edit',
        class : classNames('infinite-tree-edit')
      },
      ''
    );

    const treeNode = tag(
      'div',
      {
        class : 'infinite-tree-node',
        style : 'margin-left: ' + depth * 10 + 'px'
      },
      toggler + icon + title + checkbox + label + deleteIcon + editIcon
    );

    let treeNodeAttributes = {
      draggable       : 'false',
      'data-id'       : id,
      'data-expanded' : more && open,
      'data-depth'    : depth,
      'data-path'     : path,
      'data-selected' : selected,
      'data-children' : childrenLength,
      'data-total'    : total,
      class           : classNames('infinite-tree-item', { 'infinite-tree-selected': selected })
    };
    if (droppable) {
      treeNodeAttributes['droppable'] = true;
    }

    return tag('div', treeNodeAttributes, treeNode);
  }

}

export { ProjectManager, ProjectExplorer };
