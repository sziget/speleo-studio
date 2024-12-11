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
                const startName = !firstSurveyProcessed ? '0' : undefined;
                const startPosition = !firstSurveyProcessed ? new M.Vector(0, 0, 0) : undefined;
                const stationsLocal = calculateSurveyStations(shots, stationsGlobal, [], startName, startPosition);

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
    const stationsLocal = calculateSurveyStations(shots, new Map(), [], shots[0].from, new M.Vector(0, 0, 0));
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

export function calculateSurveyStations(shots, prevStations, aliases, startName, startPosition) {
    const stations = new Map();
    if (shots.length === 0) return stations;

    let isolated = true;
    const startStationName = startName !== undefined ? startName : shots[0].from;

    if (startPosition !== undefined) {
        stations.set(startStationName, startPosition);
    } else if (startPosition === undefined && prevStations.has(shots[0].from)) {
        stations.set(startStationName, prevStations.get(shots[0].from));
        isolated = false;
    }

    shots.forEach(sh => {
        sh.processed = false;
    });

    var repeat = true;

    while (repeat) {
        repeat = false;
        shots.forEach((sh) => {
            if (sh.processed) return; // think of it like a continue statement in a for loop

            let fromStation = stations.get(sh.from);
            let toStation = stations.get(sh.to);

            if (fromStation === undefined && prevStations.has(sh.from)) {
                fromStation = prevStations.get(sh.from);
                isolated = false;
            }

            if (toStation === undefined && prevStations.has(sh.to)) {
                toStation = prevStations.get(sh.to);
                isolated = false;
            }

            if (fromStation !== undefined) {
                if (toStation === undefined) {  // from = 1, to = 0
                    const polarVector = U.fromPolar(sh.length, U.degreesToRads(sh.azimuth), U.degreesToRads(sh.clino));
                    const st = new M.Vector(fromStation.x, fromStation.y, fromStation.z).add(polarVector);
                    stations.set(sh.to, st);
                    repeat = true;
                } else {
                    //from = 1, to = 1
                }
                sh.processed = true;
            } else if (toStation !== undefined) { // from = 0, to = 1

                const st = new M.Vector(toStation.x, toStation.y, toStation.z).sub(polarVector);
                stations.set(sh.from, st);
                sh.processed = true;
                repeat = true;
            } else { //from = 0, to = 0, look for aliases
                let falias = aliases.find(a => a.contains(sh.from));
                let talias = aliases.find(a => a.contains(sh.to));
                if (falias === undefined && talias === undefined) return;  // think of it like a continue statement in a for loop
                const polarVector = U.fromPolar(sh.length, U.degreesToRads(sh.azimuth), U.degreesToRads(sh.clino));
               
                if (falias !== undefined) {
                    const pairName = falias.getPair(sh.from);
                    if (prevStations.has(pairName)) {
                        const from = prevStations.get(pairName);
                        const to = new M.Vector(from.x, from.y, from.z).add(polarVector);
                        stations.set(sh.to, to);
                        repeat = true;
                        isolated = false;
                    }
                }

                if (talias !== undefined) {
                    const pairName = talias.getPair(sh.to);
                    if (prevStations.has(pairName)) {
                        const to = prevStations.get(pairName);
                        const from = new M.Vector(to.x, to.y, to.z).sub(polarVector);
                        stations.set(sh.from, from);
                        repeat = true;
                        isolated = false;
                    }
                }
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

