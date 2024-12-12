import * as M from "./model.js";
import { SurveyHelper } from "./survey.js";

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

const getShotsFromPolygonSurvey = function (iterator) {
    var it;
    var i = 0;
    const parseMyFloat = (str) => parseFloat(str.replace(',', '.'));
    const shots = []
    do {
        it = iterator.next();
        const parts = it.value[1].split(/\t|\s/);
        if (parts.length > 10) {
            // splays are not supported by polygon format
            shots.push(new M.Shot(i++, 'center', parts[0], parts[1], parseMyFloat(parts[2]), parseMyFloat(parts[3]), parseMyFloat(parts[4])));
        }
    } while (!it.done && it.value[1] != '');

    return shots;
};


export function getCaveFromPolygonFile(wholeFileInText) {
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
        var firstSurveyProcessed = false;
        do {
            surveyName = iterateUntil(lineIterator, (v) => !v.startsWith("Survey name"));
            if (surveyName !== undefined) {
                const surveyNameStr = surveyName.substring(13);
                iterateUntil(lineIterator, (v) => v !== "Survey data");
                lineIterator.next(); //From To ...
                const shots = getShotsFromPolygonSurvey(lineIterator);
                const startName = !firstSurveyProcessed ? '0' : undefined;
                const startPosition = !firstSurveyProcessed ? new M.Vector(0, 0, 0) : undefined;
                const stationsLocal = SurveyHelper.calculateSurveyStations(shots, stationsGlobal, [], startName, startPosition);

                for (const [stationName, stationPosition] of stationsLocal) {
                    stationsGlobal.set(stationName, stationPosition);
                }
                surveys.push(new M.Survey(surveyNameStr, true, stationsLocal, shots));
                firstSurveyProcessed = true;
            }

        } while (surveyName !== undefined)

        const cave = new M.Cave(projectName, surveys, true);
        return cave;
    }
}

export function importCsvFile(csvData) {
    const shots = getShotsFromCsv(csvData);
    const stationsLocal = SurveyHelper.calculateSurveyStations(shots, new Map(), [], shots[0].from, new M.Vector(0, 0, 0));
    const [clSegments, splaySegments] = SurveyHelper.getSegments(stationsLocal, shots);
    return [stationsLocal, shots, clSegments, splaySegments];
}

function getShotsFromCsv(csvData) {
    const shots = [];

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
        const type = to === '-' ? 'splay' : 'center';
        shots.push(new M.Shot(i, type, from, to, distance, azimuth, clino));
    }
    return shots;
}


