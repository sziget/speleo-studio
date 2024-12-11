import * as U from "./utils.js";
import * as M from "./model.js";

const iterateUntil = function (iterator, condition) {
    var it;
    do {
        it = iterator.next();
    } while (!it.done && condition(it.value[1]));

    if (it.done) {
        return undefined;
    } else {
        return it.value[1];
    }
};

const parseSurveyData = function (iterator) {
    var it;
    const parseMyFloat = (str) => parseFloat(str.replace(',', '.'));
    const surveyData = []
    do {
        it = iterator.next();
        const parts = it.value[1].split(/\t|\s/);
        if (parts.length > 10) {
            surveyData.push([parts[0], parts[1], parseMyFloat(parts[2]), parseMyFloat(parts[3]), parseMyFloat(parts[4])]);
        }
    } while (!it.done && it.value[1] != '');

    return surveyData;
};


export function getCaveFromPolygonFile(wholeFileInText, addToSceneFn) {
    if (wholeFileInText.startsWith("POLYGON Cave Surveying Software")) {
        const lines = wholeFileInText.split(/\r\n|\n/);
        const lineIterator = lines.entries();
        iterateUntil(lineIterator, (v) => v !== "*** Project ***");
        const caveNameResult = lineIterator.next();

        if (!caveNameResult.value[1].startsWith("Project name:")) {
            showError(`Invalid file, unable to read project name at line ${caveNameResult.value[0]}`);
            return;
        }

        const projectName = caveNameResult.value[1].substring(13);
        const surveys = []
        const stationsGlobal = new Map();
        var surveyName;
        do {
            surveyName = iterateUntil(lineIterator, (v) => !v.startsWith("Survey name"));
            if (surveyName !== undefined) {
                const surveyNameStr = surveyName.substring(13);
                iterateUntil(lineIterator, (v) => v !== "Survey data");
                lineIterator.next(); //From To ...
                const surveyData = parseSurveyData(lineIterator);
                const [stations, shots, polygonSegments] = getStationsAndSplaysPolygon(surveyData, stationsGlobal);
                for (const [stationName, stationPosition] of stations) {
                    stationsGlobal.set(stationName, stationPosition);
                }
                const [lineSegmentsPolygon, lineSegmentsSplays, stationNamesGroup, stationSpheresGroup] = addToSceneFn(stations, polygonSegments, []);
                surveys.push(new M.Survey(surveyNameStr, true, stations, lineSegmentsPolygon, [], stationNamesGroup, stationSpheresGroup));
            }

        } while (surveyName !== undefined)
        
        const cave = new M.Cave(projectName, surveys, true);
        return cave;
    }
}

function getStationsAndSplaysPolygon(surveyData, stationsFromPreviousSurveys) {
    const stationsSegments = [];
    const start = new M.Vector(0, 0, 0);
    const stations = new Map();
    const shots = [];
    stations.set('0', start);
    
    for (let i = 0; i < surveyData.length; i++) {
        const row = surveyData[i];
        if (row === null || row.length != 5) {
            continue;
        }
        const from = row[0];
        const to = row[1];
        const distance = row[2];
        const azimuth = row[3];
        const clino = row[4];
        shots.push(new M.Shot(i, from, to, distance, azimuth, clino));
        const polarVector = U.fromPolar(distance, U.degreesToRads(azimuth), U.degreesToRads(clino));
        const stationFrom = stations.has(from) ? stations.get(from) : stationsFromPreviousSurveys.get(from);
        const stationTo = new M.Vector(stationFrom.x, stationFrom.y, stationFrom.z).add(polarVector);

        if (!stations.has(to)) {
            stations.set(to, stationTo);
        }

        stationsSegments.push(stationFrom.x, stationFrom.y, stationFrom.z, stationTo.x, stationTo.y, stationTo.z);

    }

    return [stations, shots, stationsSegments]
}

export function getStationsAndSplays(startName, startPosition, csvData) {

    const shots = [];    
    const stations = new Map();
    const splays = []
    const stationsPoints = []

    stations.set(startName, startPosition);

    for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        if (row === null || row.length != 8) {
            continue;
        }
        const from = row[0];
        const to = row[1];
        const distance = row[2];
        const azimuth = row[3];
        const clino = row[4];
        const type = to === '-' ? 'splay' : 'polyline'
        shots.push(new M.Shot(i, from, to, distance, azimuth, clino));
        const polarVector = U.fromPolar(distance, U.degreesToRads(azimuth), U.degreesToRads(clino));
        const stationFrom = stations.get(from);
        const stationTo = new M.Vector(stationFrom.x, stationFrom.y, stationFrom.z).add(polarVector);

        if (!stations.has(to)) {
            stations.set(to, stationTo);
        }

        if (to === '-') {
            splays.push(
                stationFrom.x,
                stationFrom.y,
                stationFrom.z,
                stationFrom.x + polarVector.x,
                stationFrom.y + polarVector.y,
                stationFrom.z + polarVector.z,
            );
        } else {
            stationsPoints.push(stationFrom.x, stationFrom.y, stationFrom.z, stationTo.x, stationTo.y, stationTo.z);
        }
    }
    return [stations, shots, stationsPoints, splays]
}

