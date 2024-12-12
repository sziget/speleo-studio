import * as THREE from 'three';


import * as I from "./import.js";
import * as M from "./model.js";
import { ProjectExplorer } from "./explorer.js";
import { OPTIONS } from "./config.js";
import { Database } from "./db.js";
import { MyScene } from "./scene.js";
import * as U from "./utils.js";
import * as A from "./interactive.js";
import * as MAT from "./materials.js";
import { NavigationBar } from "./navbar.js";

import { addGui } from "./gui.js";

let gui;
let db = new Database()
let explorer, myscene, navbar;


const cavesModified = new Set();
let cavesStationNamesGroup;

init();
myscene.renderScene();

document.getElementById("surveydatapanel-close").addEventListener("click", function () {

    //surveydata.innerHTML = '';
    surveydatapanel.style.display = 'none';

    if (cavesModified.size > 0) {
        cavesModified.forEach(cn => {
            const editedCave = db.caves.find(c => c.name === cn);
            let surveyStations = new Map();
            editedCave.surveys.entries().forEach(([index, es]) => {
                es.isolated = false;
                const startName = index === 0 ? es.shots[0].from : undefined;
                const startPosition = index === 0 ? new M.Vector(0, 0, 0) : undefined;
                const stations = I.calculateSurveyStations(es.shots, surveyStations, [], startName, startPosition);
                es.isolated = (stations.size === 0);
                es.stations = stations;
                stations.forEach((v, k) => surveyStations.set(k, v));
                const [clSegments, splaySegments] = I.getSegments(stations, es.shots);
                myscene.disposeSurvey(cn, es.name);
                const [cl, sl, sn, ss, group] = addToScene(stations, clSegments, splaySegments);
                myscene.addSurvey(cn, es.name, { 'id': U.randomAlphaNumbericString(5), 'centerLines': cl, 'splays': sl, 'stationNames': sn, 'stationSpheres': ss, 'group': group });

            });
        });
        cavesModified.clear();
        myscene.renderScene();
    }
});

function init() {

    if (document.addEventListener) {
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false);
    } else {
        document.attachEvent('oncontextmenu', function () {
            window.event.returnValue = false;
        });
    }


    const sceneDOMElement = document.querySelector("canvas"); //document.getElementById("#threejscanvas");

    cavesStationNamesGroup = [];

    
    myscene = new MyScene(OPTIONS, sceneDOMElement);
    navbar = new NavigationBar(document.getElementById("navbarcontainer"), OPTIONS, myscene);
    explorer = new ProjectExplorer(OPTIONS, db, myscene, cavesModified);
    gui = addGui(OPTIONS, myscene, MAT.materials);


    //document.addEventListener('pointermove', A.onPointerMove);
    // sceneDOMElement.addEventListener('click',
    //     function (event) {
    //         A.onClick(
    //             event,
    //             scene,
    //             MAT.materials
    //         );
    //     }, false);
    //     sceneDOMElement.addEventListener('mousedown',
    //     function (event) {
    //         A.onMouseDown(
    //             event,
    //             myscene,
    //             MAT.materials
    //         );
    //     }, false);
    // getdistance.addEventListener("click",
    //     function (event) {
    //         A.calcualteDistanceListener(
    //             event,
    //             myscene,
    //             MAT.materials
    //         );
    //     }, false);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('cave')) {
        const caveNameUrl = urlParams.get('cave');

        if (caveNameUrl.includes('.cave')) {
            fetch(caveNameUrl).then(data => data.blob()).then(res => imporPolygonFromFile(res)).catch(error => console.error(error));
        }
    }
}

function imporPolygonFromFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => importPolygon(event.target.result);
    reader.readAsText(file, "iso_8859-2");
}

function importPolygon(wholeFileInText) {
    const cave = I.getCaveFromPolygonFile(wholeFileInText);
    db.caves.push(cave);
    cave.surveys.forEach(s => {
        const [centerLineSegments, splaySegments] = I.getSegments(s.stations, s.shots);
        const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup, group] = myscene.addToScene(s.stations, centerLineSegments, splaySegments);
        myscene.addSurvey(cave.name, s.name, { 'id': U.randomAlphaNumbericString(5), 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup, 'group': group });
    });
    explorer.renderTrees();
    myscene.fitScene();

}

function importCsvFile(file) {
    Papa.parse(file, {
        header: false,
        comments: "#",
        dynamicTyping: true,
        complete: function (results) {
            const [stations, shots, centerLineSegments, splaySegments] = I.importCsvFile(results.data);
            const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup, group] = myscene.addToScene(stations, centerLineSegments, splaySegments);
            const caveName = file.name;
            const surveyName = 'polygon';
            const cave = new M.Cave(caveName, [new M.Survey(surveyName, true, stations, shots)], true);
            db.caves.push(cave);
            myscene.addSurvey(caveName, surveyName, { 'id': U.randomAlphaNumbericString(5), 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup, 'group': group });
            explorer.renderTrees();
            myscene.fitScene();
        },
        error: function (error) {
            console.error('Error parsing CSV:', error);
        }
    });
}

document.getElementById('topodroidInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        importCsvFile(file);
    }
});

document.getElementById('polygonInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        imporPolygonFromFile(file);
    }
});