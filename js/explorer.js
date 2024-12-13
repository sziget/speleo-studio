import { classNames } from './external/classnames.js';
import { tag } from './external/html5-tag.js';
import { escapeHtml } from "./external/escape-html.js";

import * as U from "./utils.js";
import { SurveyHelper } from "./survey.js";


export class ProjectManager {
    constructor (db, scene, explorer) {
        this.db = db;
        this.scene = scene;
        this.explorer = explorer;
        document.addEventListener('surveyChanged', (e) => this.onSurveyChanged(e));
        document.addEventListener('surveyDeleted', (e) => this.onSurveyDeleted(e));
    }

    onSurveyChanged(e) {
        const caveName = e.detail.cave;
        const surveyName = e.detail.survey;
        this.recalculateCave(this.db.caves.get(caveName));
        this.scene.renderScene();
    }

    onSurveyDeleted(e) {
        const caveName = e.detail.cave;
        const surveyName = e.detail.survey;
        this.scene.disposeSurvey(caveName, surveyName);
        this.recalculateCave(this.db.caves.get(caveName));
        this.scene.renderScene();
        this.explorer.deleteSurvey(caveName, surveyName);
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

    // recalculateCaves() {
    //     this.db.caves.forEach(c => {
            
    //     this.recalculateCave(c)
            
    //     });
    //     this.scene.renderScene();
    // }

}

export class ProjectExplorer {
    
    constructor(options, db, scene, surveyeditor) {
        this.options = options;
        this.db = db;
        this.scene = scene;
        this.trees = new Map();
        this.surveyeditor = surveyeditor;
    }

    deleteSurvey(caveName, surveyName) {
        const tree = this.trees.get(caveName);
        const rootCave = tree.getChildNodes()[0];
        const surveyNode = tree.getChildNodes(rootCave).find(n => n.name === surveyName);
        tree.removeNode(surveyNode);
    }

    renderTrees() {
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
        document.querySelector('#tree-panel').innerHTML = '';

        this.db.caves.forEach((cave) => {
            const tree = new InfiniteTree({
                el: document.querySelector('#tree-panel'),
                data: mapCave(cave),
                autoOpen: false,
                rowRenderer: this.treeRenderer,
                scene: this.scene
            });
            this.trees.set(cave.name, tree);

            tree.on('click', this.click(tree));

            tree.on('contentDidUpdate', () => {
                this.updateIndeterminateState(tree);
            });

            tree.on('clusterDidChange', () => {
                this.updateIndeterminateState(tree);
            });


        });
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
            this.surveyeditor.setupTable(state.cave.name, state.survey.name, state.survey.shots);
        } else if (event.target.id === "delete") {
            if (state.nodeType === "survey") {
                this.db.deleteSurvey(state.cave.name, state.survey.name);
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
                { 'glyphicon-file': !more }
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
            'class': classNames('infinite-tree-title')
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

        const deleteOrClose = state.nodeType === 'survey' ? 'delete' : 'close';
        const deleteOrCloseGlyph = state.nodeType === 'survey' ? 'trash' : 'remove';
        const deleteIcon = tag('span', {
            'id': deleteOrClose, 
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