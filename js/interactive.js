import * as THREE from 'three';

import * as PANELS from "./panels.js";

let pointer = new THREE.Vector2();
let selectedStation, selectedStationForContext;
let raycaster = new THREE.Raycaster();

export function calcualteDistanceListener(event, rect, materials, renderFn) {
    const left = event.clientX - rect.left;
    const top = event.clientY - rect.top;

    if (selectedStation === undefined) {
        PANELS.showErrorPanel("You should select the starting point for distance measurement", left, top);
    } else {
        const from = selectedStation.position.clone();
        const to = selectedStationForContext.position.clone();
        const diff = to.sub(from);
        hideContextMenu();
        showDistancePanel(diff, left, top);

        selectedStationForContext.material = materials.sphere;
        selectedStationForContext = undefined;
        selectedStation.material = materials.sphere;
        selectedStation = undefined;
        renderFn();
    }
}

export function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

export function onClick(event, cavesStationSpheresGroup, currentCamera, materials, renderFn) {
    if (cavesStationSpheresGroup !== undefined) {
        raycaster.setFromCamera(pointer, currentCamera);
        const intersects = raycaster.intersectObjects(cavesStationSpheresGroup);

        if (intersects.length) {
            const intersectedObject = intersects[0].object; // first intersected object

            if (intersectedObject === selectedStation) {
                intersectedObject.material = materials.sphere;
                selectedStation = undefined;
            } else {
                if (selectedStation !== undefined) {
                    selectedStation.material = materials.sphere;
                }

                if (selectedStationForContext === intersectedObject) {
                    hideContextMenu();
                }
                intersectedObject.material = materials.selectedSphere;
                selectedStation = intersectedObject;
            }


        } else if (selectedStation !== undefined) {
            selectedStation.material = materials.sphere;
            selectedStation = undefined;
        }

        renderFn();

    }
}

export function onMouseDown(event, cavesStationSpheresGroup, currentCamera, materials, rect, renderFn) {
    event.preventDefault();
    var rightclick;
    if (!event) var event = window.event;
    if (event.which) rightclick = (event.which == 3);
    else if (event.button) rightclick = (event.button == 2);
    if (!rightclick) return;

    if (cavesStationSpheresGroup !== undefined) {
        raycaster.setFromCamera(pointer, currentCamera);

        var intersects = raycaster.intersectObjects(cavesStationSpheresGroup);

        if (intersects.length) {
            const intersectedObject = intersects[0].object;
            if (intersectedObject === selectedStation) {
                if (selectedStationForContext !== undefined) {
                    selectedStationForContext.material = materials.sphere;
                    showContextMenu(event.clientX - rect.left, event.clientY - rect.top);
                }
                selectedStationForContext = intersectedObject;
                selectedStationForContext.material = materials.selectedContextSphere;
                selectedStation = undefined;
            } else {
                if (selectedStationForContext !== undefined) {
                    selectedStationForContext.material = materials.sphere;
                }
                selectedStationForContext = intersectedObject;
                intersectedObject.material = materials.selectedContextSphere;
                showContextMenu(event.clientX - rect.left, event.clientY - rect.top);
            }

            renderFn();
        }

    }
}

function showContextMenu(left, top) {
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    menu.style.display = "";
}

function hideContextMenu() {
    menu.style.display = "none";
}

function showDistancePanel(diffVector, left, top) {
    infopanel.style.left = left + "px";
    infopanel.style.top = top + "px";
    infopanel.style.display = "block";
    infopanelcontent.innerHTML = `
    X distance: ${diffVector.x}<br>
    Y distance: ${diffVector.y}<br>
    Z distance: ${diffVector.z}<br>
    Horizontal distance: ${Math.sqrt(Math.pow(diffVector.x, 2), Math.pow(diffVector.y))}<br>
    Spatial distance: ${diffVector.length()}
    `
}