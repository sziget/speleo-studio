import * as M from "./model.js";
import * as U from "./utils.js";

export class SurveyHelper {

    static recalculateSurvey(index, es, surveyStations) {
        es.isolated = false;
        const startName = index === 0 ? es.shots[0].from : undefined;
        const startPosition = index === 0 ? new M.Vector(0, 0, 0) : undefined;
        const [stations, orphanShotIds] = SurveyHelper.calculateSurveyStations(es.shots, surveyStations, [], startName, startPosition);
        es.isolated = (stations.size === 0);
        es.stations = stations;
        es.orphanShotIds = orphanShotIds;
        stations.forEach((v, k) => surveyStations.set(k, v)); //merge
        return es;
    }

    static calculateSurveyStations(shots, prevStations, aliases, startName, startPosition) {
        const stations = new Map();
        if (shots.length === 0) return stations;

        const startStationName = startName !== undefined ? startName : shots[0].from;

        if (startPosition !== undefined) {
            stations.set(startStationName, startPosition);
        } else if (startPosition === undefined && prevStations.has(shots[0].from)) {
            stations.set(startStationName, prevStations.get(shots[0].from));
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
                }

                if (toStation === undefined && prevStations.has(sh.to)) {
                    toStation = prevStations.get(sh.to);
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
                        }
                    }

                    if (talias !== undefined) {
                        const pairName = talias.getPair(sh.to);
                        if (prevStations.has(pairName)) {
                            const to = prevStations.get(pairName);
                            const from = new M.Vector(to.x, to.y, to.z).sub(polarVector);
                            stations.set(sh.from, from);
                            repeat = true;
                        }
                    }
                }

            });
        }

        const unprocessedShots = new Set(shots.filter((sh) => !sh.processed).map(sh => sh.id));
        return [stations, unprocessedShots];
    }

    static getSegments(stationsGlobal, shots) {
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
}