import { classNames } from './external/classnames.js';
import { tag } from './external/html5-tag.js';
import { escapeHtml } from "./external/escape-html.js";

import * as U from "./utils.js";
import { SurveyHelper } from "./survey.js";


export class ProjectManager {
    constructor(db, scene, explorer) {
        this.db = db;
        this.scene = scene;
        this.explorer = explorer;
        document.addEventListener('surveyChanged', (e) => this.onSurveyChanged(e));
        document.addEventListener('surveyDeleted', (e) => this.onSurveyDeleted(e));
        document.addEventListener('caveDeleted', (e) => this.onCaveDeleted(e));
    }

    onSurveyChanged(e) {
        const caveName = e.detail.cave;
        const surveyName = e.detail.survey;
        const cave = this.db.caves.get(caveName);
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
        this.scene.renderScene();
        this.explorer.deleteCave(caveName);
    }

    recalculateCave(cave) {
        let surveyStations = new Map();
        cave.surveys.entries().forEach(([index, es]) => {
            const ns = SurveyHelper.recalculateSurvey(index, es, surveyStations);
            this.#emitSurveyRecalculated(cave.name, es.name, es.shots, es.orphanShotIds);
            const [clSegments, splaySegments] = SurveyHelper.getSegments(es.stations, es.shots);
            this.scene.disposeSurvey(cave.name, es.name);
            const [cl, sl, sn, ss, group] = this.scene.addToScene(es.stations, clSegments, splaySegments, cave.visible && es.visible);
            this.scene.addSurvey(cave.name, es.name, { 'id': U.randomAlphaNumbericString(5), 'centerLines': cl, 'splays': sl, 'stationNames': sn, 'stationSpheres': ss, 'group': group });
        });
    }

    #emitSurveyRecalculated(caveName, surveyName, shots, orphanShotIds) {
        const event = new CustomEvent("surveyRecalculated", {
            detail: {
                cave: caveName,
                survey: surveyName,
                shots: shots,
                orphanShotIds: orphanShotIds
            }
        });
        document.dispatchEvent(event);
    }

}

export class ProjectExplorer {

    constructor(options, db, scene, surveyeditor) {
        this.options = options;
        this.db = db;
        this.scene = scene;
        this.trees = new Map();
        this.surveyeditor = surveyeditor;
        this.itree = undefined;
    }

    deleteSurvey(caveName, surveyName) {
        const caveNode = this.itree.getChildNodes().find(n => n.name === caveName);
        const surveyNode = this.itree.getChildNodes(caveNode).find(n => n.name === surveyName);
        this.itree.removeNode(surveyNode);
    }

    deleteCave(caveName) {
        const caveNode = this.itree.getChildNodes().find(n => n.name === caveName);
        this.itree.removeNode(caveNode);
    }

    updateCave(cave) {
        const caveNode = this.itree.getChildNodes().find(n => n.name === cave.name);
        const data = this.transformCave(cave);
        this.itree.updateNode(caveNode, data);
    }

    initializeTree(data) {
        this.itree = new InfiniteTree({
            el: document.querySelector('#tree-panel'),
            data: data,
            autoOpen: true,
            rowRenderer: this.treeRenderer,
            scene: this.scene
        });
        this.itree.on('click', this.click(this.itree));

        this.itree.on('contentDidUpdate', () => {
            this.updateIndeterminateState(this.itree);
        });

        this.itree.on('clusterDidChange', () => {
            this.updateIndeterminateState(this.itree);
        });
    }

    transformCave(cave) {
        const mapSurvey = (cave, survey) => {
            return {
                id: U.randomAlphaNumbericString(8),
                name: survey.name,
                loadOnDemand: true,
                state: { checked: survey.visible, nodeType: 'survey', cave: cave, survey: survey }
            };
        }
        const mapCave = (cave) => {
            return {
                id: U.randomAlphaNumbericString(8),
                name: cave.name,
                children: cave.surveys.map(s => mapSurvey(cave, s)),
                loadOnDemand: true,
                state: { checked: cave.visible, nodeType: 'cave', cave: cave }
            };
        }
        return mapCave(cave);
    }

    addCave(cave) {
        const data = this.transformCave(cave);

        if (this.itree === undefined) {
            this.initializeTree(data)
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

            if (state.nodeType === "survey") {
                state.survey.visible = value;
                this.scene.setSurveyVisibility(state.cave.name, state.survey.name, value);
            } else if (state.nodeType === "cave") {
                const cave = state.cave;
                cave.visible = value;
                cave.surveys.forEach((survey) => {
                    survey.visible = value;
                    this.scene.setSurveyVisibility(cave.name, survey.name, value);
                });
            }

            tree.checkNode(currentNode);
            return;
        } else if (event.target.id === "edit") {
            this.surveyeditor.show();
            this.surveyeditor.setupTable(state.cave.name, state.survey.name, state.survey.shots, state.survey.orphanShotIds);
        } else if (event.target.id === "delete") {
            if (state.nodeType === "survey") {
                this.db.deleteSurvey(state.cave.name, state.survey.name);
            } else if (state.nodeType === "cave") {
                this.db.deleteCave(state.cave.name);
            }
        }
    }

    updateIndeterminateState = (tree) => {
        const checkboxes = tree.contentElement.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxes.length; ++i) {
            const checkbox = checkboxes[i];
            if (checkbox.hasAttribute('data-indeterminate')) {
                checkbox.indeterminate = true;
            } else {
                checkbox.indeterminate = false;
            }
        }
    }

    treeRenderer(node, treeOptions) {
        const { id, name, loadOnDemand = false, children, state, props = {} } = node;
        const droppable = (treeOptions.droppable) && (props.droppable);
        const { depth, open, path, total, selected = false, filtered, checked, indeterminate } = state;
        const childrenLength = Object.keys(children).length;
        const more = node.hasChildren();
        
        const isolatedSurvey = state.nodeType === 'survey' && state.survey.isolated === true;

        if (filtered === false) {
            return;
        }

        let togglerContent = '';
        if (!more && loadOnDemand) {
            togglerContent = tag('i', {
                'class': classNames('glyphicon', 'glyphicon-triangle-right')
            }, '');
        }
        if (more && open) {
            togglerContent = tag('i', {
                'class': classNames('glyphicon', 'glyphicon-triangle-bottom')
            }, '');
        }
        if (more && !open) {
            togglerContent = tag('i', {
                'class': classNames('glyphicon', 'glyphicon-triangle-right')
            }, '');
        }
        if (state.expanding && !state.loading) {
            togglerContent = tag('i', {
                'class': classNames('glyphicon', 'glyphicon-refresh', 'rotating')
            }, '');
        }
        if (state.collapsing) {
            // TODO
        }
        const toggler = tag('a', {
            'class': (() => {
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
        }, togglerContent);

        const icon = tag('i', {
            'class': classNames(
                'infinite-tree-folder-icon',
                'glyphicon',
                { 'glyphicon-folder-open': more && open },
                { 'glyphicon-folder-close': more && !open },
                { 'glyphicon-file': !more && !isolatedSurvey },
                { 'glyphicon-exclamation-sign': !more && isolatedSurvey },
                { 'infinite-tree-isolated': isolatedSurvey }
            )
        }, '');

        const checkbox = tag('input', {
            type: 'checkbox',
            style: 'display: inline-block; margin: 0 4px',
            'class': 'checkbox',
            checked: checked,
            'data-checked': checked,
            'data-indeterminate': indeterminate
        });

        const title = tag('span', {
            'class': classNames(
                'infinite-tree-title',
                { 'infinite-tree-isolated': isolatedSurvey }
            )
        }, escapeHtml(name));

        const loadingIcon = tag('i', {
            'style': 'margin-left: 5px',
            'class': classNames(
                { 'hidden': !state.loading },
                'glyphicon',
                'glyphicon-refresh',
                { 'rotating': state.loading }
            )
        }, '');

        const deleteOrCloseGlyph = state.nodeType === 'survey' ? 'trash' : 'remove';
        const deleteIcon = tag('span', {
            'id': 'delete',
            'class': classNames('infinite-tree-delete', 'glyphicon', `glyphicon-${deleteOrCloseGlyph}`)
        }, '')


        const editIcon = tag('span', {
            'id': 'edit',
            'class': classNames('infinite-tree-edit', 'glyphicon', 'glyphicon-edit')
        }, '');

        const treeNode = tag('div', {
            'class': 'infinite-tree-node',
            'style': 'margin-left: ' + depth * 18 + 'px'
        }, toggler + checkbox + icon + title + loadingIcon + deleteIcon + editIcon);

        let treeNodeAttributes = {
            'draggable': 'true',
            'data-id': id,
            'data-expanded': more && open,
            'data-depth': depth,
            'data-path': path,
            'data-selected': selected,
            'data-children': childrenLength,
            'data-total': total,
            'class': classNames(
                'infinite-tree-item',
                { 'infinite-tree-selected': selected }
            )
        };
        if (droppable) {
            treeNodeAttributes['droppable'] = true;
        }

        return tag('div', treeNodeAttributes, treeNode);
    }
}