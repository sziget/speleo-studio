import * as THREE from 'three';
import { showErrorPanel } from './popups.js';
import { get3DCoordsStr } from "./utils.js";

export class SceneInteraction {

    constructor(footer, scene, materials, sceneDOMElement, calcDistanceButton, contextMenu, infoPanel) {
        this.footer = footer;
        this.scene = scene;
        this.materials = materials;
        this.pointer = new THREE.Vector2();
        this.contextMenu = contextMenu;
        this.infoPanel = infoPanel;
        this.selectedStation = undefined;
        this.selectedStationForContext = undefined;

        document.addEventListener('pointermove', (event) => this.onPointerMove(event));
        sceneDOMElement.addEventListener('click', (event) => this.onClick(event), false);
        sceneDOMElement.addEventListener('mousedown', (event) => this.onMouseDown(event), false);

        calcDistanceButton.addEventListener("click", (event) => this.calcualteDistanceListener(event), false);
    }

    onPointerMove(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    calcualteDistanceListener(event) {
        const rect = this.scene.getBoundingClientRect();
        const left = event.clientX - rect.left;
        const top = event.clientY - rect.top;

        if (this.selectedStation === undefined) {
            showErrorPanel("You should select the starting point for distance measurement");
        } else {
            const from = this.selectedStation.position.clone();
            const to = this.selectedStationForContext.position.clone();
            const diff = to.clone().sub(from);
            this.hideContextMenu();

            const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
            const line = new THREE.Line(geometry, this.materials.distanceLine);
            line.computeLineDistances();
            this.scene.addObjectToScene(line);

            this.showDistancePanel(this.selectedStation, this.selectedStationForContext, diff, left, top, () =>  { this.scene.removeFromScene(line); this.scene.renderScene(); });

            this.#clearSelectedForContext();
            this.#clearSelected();
            this.scene.renderScene();
        }
    }

    getMaterialForType(object) {
        switch (object.type) {
            case 'splay' : return this.materials.sphere.splay;
            case 'center' : return this.materials.sphere.centerLine;
            default: throw new Error(`Uknown object type for sphere ${object.type}`);
        }
    }

    #setSelected(st) {
        this.selectedStation = st;
        this.selectedStation.material = this.materials.sphere.selected;
        this.selectedStation.scale.setScalar(1.7);
        this.footer.addMessage(`${st.name} selected, position: ${get3DCoordsStr(st.position)}`);
    }

    #clearSelected() {
        this.selectedStation.material = this.getMaterialForType(this.selectedStation);
        this.selectedStation.scale.setScalar(1.0);
        this.selectedStation = undefined;
    }

    #setSelectedForContext(st) {
        this.selectedStationForContext = st;
        this.selectedStationForContext.material = this.materials.sphere.selectedForContext;
        this.selectedStationForContext.scale.setScalar(1.7);
        this.footer.addMessage(`${st.name} selected, position: ${get3DCoordsStr(st.position)}`);
    }

    #clearSelectedForContext() {
        this.selectedStationForContext.material = this.getMaterialForType(this.selectedStationForContext);
        this.selectedStationForContext.scale.setScalar(1.0);
        this.selectedStationForContext = undefined;
    }    

    onClick(event) {
        const intersects = this.scene.getIntersectedStationSpheres(this.pointer);

        if (intersects.length) {
            const intersectedObject = intersects[0].object; // first intersected object

            if (intersectedObject === this.selectedStation) { // clicked on the same sphere again
                this.#clearSelected();
            } else { // clicked an other object
                if (this.selectedStation !== undefined) { // deactivate previouly selected sphere
                    this.#clearSelected()
                }
                if (this.selectedStationForContext === intersectedObject) {
                    this.hideContextMenu();
                }
                this.#setSelected(intersectedObject);
            }
        } else if (this.selectedStation !== undefined) {
            this.#clearSelected();
        }
        this.scene.renderScene();
    }

    onMouseDown(event) { // right click
        event.preventDefault();
        var rightclick;
        if (!event) var event = window.event;
        if (event.which) rightclick = (event.which == 3);
        else if (event.button) rightclick = (event.button == 2);
        if (!rightclick) return;

        const rect = this.scene.getBoundingClientRect();
        const intersects = this.scene.getIntersectedStationSpheres(this.pointer);;

        if (intersects.length) {
            const intersectedObject = intersects[0].object;
            if (intersectedObject === this.selectedStation) {
                if (this.selectedStationForContext !== undefined) { // deselect previously selected station for context
                    this.#clearSelectedForContext();
                    this.showContextMenu(event.clientX - rect.left, event.clientY - rect.top);
                }
                this.#clearSelected();
                this.#setSelectedForContext(intersectedObject);
            } else {
                if (this.selectedStationForContext !== undefined) { // clicked on the same sphere, that was already selected
                    this.#clearSelectedForContext();
                }
                this.#setSelectedForContext(intersectedObject);
                this.showContextMenu(event.clientX - rect.left, event.clientY - rect.top);
            }
            this.scene.renderScene();
        }
    }

    showContextMenu(left, top) {
        this.contextMenu.style.left = left + "px";
        this.contextMenu.style.top = top + "px";
        this.contextMenu.style.display = "";
    }

    hideContextMenu() {
        this.contextMenu.style.display = "none";
    }

    showDistancePanel(from, to, diffVector, left, top, lineRemoveFn) {
        this.infoPanel.children.namedItem("close").onclick = () => {
            lineRemoveFn();
            this.infoPanel.style.display = 'none';
            return false;
        }
        this.infoPanel.style.left = left + "px";
        this.infoPanel.style.top = top + "px";
        this.infoPanel.style.display = "block";
        const fp = from.position;
        const formatCoords = (a) => a.map(x => x.toFixed(2)).join(",");
        const tp = to.position;
        this.infoPanel.children.namedItem("content").innerHTML = `
        From: ${from.name} (${formatCoords([fp.x, fp.y, fp.z])})<br>
        To: ${to.name} (${formatCoords([tp.x, tp.y, tp.z])})<br>
        X distance: ${diffVector.x}<br>
        Y distance: ${diffVector.y}<br>
        Z distance: ${diffVector.z}<br>
        Horizontal distance: ${Math.sqrt(Math.pow(diffVector.x, 2), Math.pow(diffVector.y, 2))}<br>
        Spatial distance: ${diffVector.length()}
        `
    }
}