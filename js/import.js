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
                const startName = !firstSurveyProcessed ? '0' : shots[0].from;
                const startPosition = !firstSurveyProcessed ? new M.Vector(0, 0, 0) : stationsGlobal.get(shots[0].from);
                const stationsLocal = calculateSurveyStations(shots, startName, startPosition);

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

// function getStationsAndSplaysPolygon(surveyData, stationsFromPreviousSurveys) {
//     const stationsSegments = [];
//     const stations = new Map();
//     const shots = [];
    
//     for (let i = 0; i < surveyData.length; i++) {
//         const row = surveyData[i];
//         if (row === null || row.length != 5) {
//             continue;
//         }
//         const from = row[0];
//         const to = row[1];
//         const distance = row[2];
//         const azimuth = row[3];
//         const clino = row[4];
//         shots.push(new M.Shot(i, from, to, distance, azimuth, clino));
//         const polarVector = U.fromPolar(distance, U.degreesToRads(azimuth), U.degreesToRads(clino));
//         const stationFrom = stations.has(from) ? stations.get(from) : stationsFromPreviousSurveys.get(from);
//         const stationTo = new M.Vector(stationFrom.x, stationFrom.y, stationFrom.z).add(polarVector);

//         if (!stations.has(to)) {
//             stations.set(to, stationTo);
//         }

//         stationsSegments.push(stationFrom.x, stationFrom.y, stationFrom.z, stationTo.x, stationTo.y, stationTo.z);

//     }

//     return [stations, shots, stationsSegments]
// }

export function importCsvFile(csvData) {
    const shots = getShotsFromCsv(csvData);
    const stationsLocal = calculateSurveyStations(shots);
    const [clSegments, splaySegments] = getSegments(stationsLocal, shots);
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

function calculateSurveyStations(shots, startName, startPosition) {

    const stations = new Map();

    const startStationName = startName !== undefined ? startName : shots[0].from;
    stations.set(startStationName, startPosition !== undefined ? startPosition : new M.Vector(0, 0, 0));

    // This algorithm is O(n^2)
    var repeat = true;
    while (repeat) {
        repeat = false;
        shots.forEach((sh) => {
            if (sh.processed) return; // think of it like a continue statement in a for loop
            const fromStation = stations.get(sh.from);
            const toStation = stations.get(sh.to);

            if (fromStation !== undefined) {
                if (toStation === undefined) {  // FROM exists and TO does not exist
                    const polarVector = U.fromPolar(sh.length, U.degreesToRads(sh.azimuth), U.degreesToRads(sh.clino));
                    const st = new M.Vector(fromStation.x, fromStation.y, fromStation.z).add(polarVector);
                    stations.set(sh.to, st);
                    repeat = true;
                } else {
                    // skip: both shot stations exist
                }
                sh.processed = true
            } else if (toStation !== undefined) { // FROM does not exist, but TO exists
                const polarVector = U.fromPolar(sh.length, U.degreesToRads(sh.azimuth), U.degreesToRads(sh.clino));
                const st = new M.Vector(toStation.x, toStation.y, toStation.z).sub(polarVector);
                stations.set(sh.from, st);
                sh.processed = true;
                repeat = true;
            } else { // the two shot stations do not exist: check aliases

            }

        });
    }

    const unprocessedShots = shots.filter((sh) => !sh.processed);
    if (unprocessedShots.length > 0) {
        //TODO: return error messages
    }
    return stations;
}

function calculateStationsGlobalWorld(stations, diff) {
    const stationsGlobal = new Map();
    console.log(stations);
    stations.forEach((name, vector) => stationsGlobal.put(name, vector.add(diff)));
    return stationsGlobal;
}

export function getSegments(stationsGlobal, shots) {
    const splaySegments = [];
    const centerlineSegments = [];
    shots.forEach(sh => {
        const fromStation = stationsGlobal.get(sh.from);
        const toStation = stationsGlobal.get(sh.to);
        if (fromStation !== undefined && toStation !== undefined) {
            switch (sh.type) {
                case 'splay':
                    splaySegments.push(fromStation.x, fromStation.y, fromStation.z, toStation.x, toStation.y, toStation.z);;
                    break;
                case 'center':
                    centerlineSegments.push(fromStation.x, fromStation.y, fromStation.z, toStation.x, toStation.y, toStation.z);;
                    break;
                default:
                    throw new Error(`Undefined segment type ${sh.type}`);

            }
            
        }
    });
    return [centerlineSegments, splaySegments];

}

