import * as U from "./utils.js";
import { Vector, Shot, Cave, Survey, SurveyStartStation, SurveyStation } from "./model.js";
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

    const shots = []
    do {
        it = iterator.next();
        const parts = it.value[1].split(/\t|\s/);
        if (parts.length > 10) {
            // splays are not supported by polygon format
            shots.push(new Shot(i++, 'center', parts[0], parts[1], U.parseMyFloat(parts[2]), U.parseMyFloat(parts[3]), U.parseMyFloat(parts[4])));
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
        var surveyIndex = 0;
        let caveStartPosition;
        do {
            surveyName = iterateUntil(lineIterator, (v) => !v.startsWith("Survey name"));
            if (surveyName !== undefined) {
                const surveyNameStr = surveyName.substring(13);
                let fixPoint = iterateUntil(lineIterator, (v) => !v.startsWith("Fix point")).substring(11);
                let posLine = lineIterator.next();
                let parts = posLine.value[1].split(/\t|\s/);
                let parsed = parts.toSpliced(3).map(x => U.parseMyFloat(x));
                let startPosParsed = new Vector(...parsed);
                let startPoint = new SurveyStartStation(fixPoint, new SurveyStation('center', startPosParsed))
                iterateUntil(lineIterator, (v) => v !== "Survey data");
                lineIterator.next(); //From To ...
                const shots = getShotsFromPolygonSurvey(lineIterator);
                let startName, startPosition;
                if (surveyIndex == 0) {
                    startName = fixPoint;
                    startPosition = startPosParsed;
                    caveStartPosition = startPosParsed;
                    if (fixPoint != shots[0].from) {
                        throw new Error(`Invalid Polygon survey, fix point ${fixPoint} != first shot's from value (${shots[0].from})`);
                    }
                }
                const [stations, orphanShotIds] = SurveyHelper.calculateSurveyStations(surveyName, shots, stationsGlobal, [], startName, startPosition);
                for (const [stationName, station] of stations) {
                    stationsGlobal.set(stationName, station);
                }
                surveys.push(new Survey(surveyNameStr, true, startPoint, stations, shots, orphanShotIds, new Map()));
                surveyIndex++;
            }

        } while (surveyName !== undefined)
        const cave = new Cave(projectName, caveStartPosition, surveys, true);
        return cave;
    }
}

export function getCaveFromCsvFile(fileName, csvData) {
    const shots = getShotsFromCsv(csvData);
    const surveyName = 'polygon'; 
    const startPoint = new SurveyStartStation(shots[0].from, new SurveyStation('center', new Vector(0, 0, 0)));
    const [stations, orphanShotIds] = SurveyHelper.calculateSurveyStations(surveyName, shots, new Map(), [], startPoint.name, startPoint.station.position);
    return new Cave(fileName, startPoint.station.position, [new Survey(surveyName, true, startPoint, stations, shots, orphanShotIds, new Map())], true);
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
        const type = (to === '-') ? 'splay' : 'center';
        const toName = (type === 'splay') ? undefined : to;
        shots.push(new Shot(i, type, from, toName, distance, azimuth, clino));
    }
    return shots;
}


