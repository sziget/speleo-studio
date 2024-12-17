import * as U from "./utils.js";
import { Vector, Survey } from "./model.js";
import { SurveyStation as ST } from "./model.js";

export class SurveyHelper {

    /**
     * Recalculates and updates survey's shots, station positions, orphan shots and isolatied property
     * @param {number} index - The 0 based index of the survey withing the surveys array of a cave
     * @param {Survey} es - The survey that will be updated in place
     * @param {Map<string, SurveyStation> } surveyStations - Previously calculated survey stations
     * @returns The survey with updated properties
     */
    static recalculateSurvey(index, es, surveyStations) {
        es.isolated = false;
        let startName, startPosition;
        if (index === 0) {
            startName = (es.start !== undefined) ? es.start.name : es.shots[0].from;
            startPosition = (es.start !== undefined) ? es.start.station.position : new Vector(0, 0, 0);
        }

        const [stations, orphanShotIds] = SurveyHelper.calculateSurveyStations(es.name, es.shots, surveyStations, [], startName, startPosition);
        es.isolated = (stations.size === 0);
        es.stations = stations;
        es.orphanShotIds = orphanShotIds;
        stations.forEach((v, k) => surveyStations.set(k, v)); //merge
        return es;
    }

    static calculateSurveyStations(surveyName, shots, prevStations, aliases, startName, startPosition) {
        const stations = new Map();
        if (shots.length === 0) return stations;

        const startStationName = startName !== undefined ? startName : shots[0].from;

        if (startPosition !== undefined) {
            stations.set(startStationName, new ST('center', startPosition));
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
                        const fp = fromStation.position;
                        const st = new Vector(fp.x, fp.y, fp.z).add(polarVector);
                        const stationName = (sh.type === 'splay') ? Survey.getSplayStationName(surveyName, sh.id) : sh.to;
                        stations.set(stationName, new ST(sh.type, st));
                        repeat = true;
                    } else {
                        //from = 1, to = 1
                    }
                    sh.processed = true;
                } else if (toStation !== undefined) { // from = 0, to = 1
                    const tp = toStation.position;
                    const st = new Vector(tp.x, tp.y, tp.z).sub(polarVector);
                    stations.set(sh.from, new ST(sh.type, st));
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
                            const fp = from.position;
                            const to = new Vector(fp.x, fp.y, fp.z).add(polarVector);
                            stations.set(sh.to, new ST(sh.type, to));
                            repeat = true;
                        }
                    }

                    if (talias !== undefined) {
                        const pairName = talias.getPair(sh.to);
                        if (prevStations.has(pairName)) {
                            const to = prevStations.get(pairName);
                            const tp = to.position;
                            const from = new Vector(tp.x, tp.y, tp.z).sub(polarVector);
                            stations.set(sh.from, new ST(sh.type, from));
                            repeat = true;
                        }
                    }
                }

            });
        }

        const unprocessedShots = new Set(shots.filter((sh) => !sh.processed).map(sh => sh.id));
        return [stations, unprocessedShots];
    }

    static getSegments(surveyName, stations, shots) {
        const splaySegments = [];
        const centerlineSegments = [];
        shots.forEach(sh => {
            const fromStation = stations.get(sh.from);
            const toStationName = (sh.type === 'splay') ? Survey.getSplayStationName(surveyName, sh.id) : sh.to;
            const toStation = stations.get(toStationName);

            if (fromStation !== undefined && toStation !== undefined) {
                const fromPos = fromStation.position;
                const toPos = toStation.position;
                switch (sh.type) {
                    case 'splay':
                        splaySegments.push(fromPos.x, fromPos.y, fromPos.z, toPos.x, toPos.y, toPos.z);;
                        break;
                    case 'center':
                        centerlineSegments.push(fromPos.x, fromPos.y, fromPos.z, toPos.x, toPos.y, toPos.z);;
                        break;
                    default:
                        throw new Error(`Undefined segment type ${sh.type}`);

                }

            }
        });
        return [centerlineSegments, splaySegments];

    }



    static getColorGradientsForCaves(caves, clOptions) {
        const colorGradients = new Map();
        if (clOptions.color.mode.value !== 'gradientByZ') return colorGradients;
        const zCoords = Array.from(caves.values().flatMap(c => {
            if (c.visible) {
                return Array.from(c.surveys.flatMap(s => {
                    if (s.visible) {
                        return Array.from(s.stations.values().map(x => x.position.z))
                    } else return;
                })).filter(x => x !== undefined);
            } else return;
        })).filter(x => x !== undefined); //TODO: should use reduce

        const maxZ = Math.max(...zCoords);
        const minZ = Math.min(...zCoords);
        const diffZ = maxZ - minZ;
        caves.forEach(c => {
            const sm = new Map();
            colorGradients.set(c.name, sm);
            c.surveys.forEach(s => {
                sm.set(s.name, SurveyHelper.getColorGradients(s.name, c.stations, s.shots, diffZ, maxZ, clOptions.color.start, clOptions.color.end));
            });

        });
        return colorGradients;
    }

    static getColorGradients(surveyName, stations, shots, diffZ, maxZ, startColor, endColor) {
        const centerColors = [];
        const splayColors = [];
        const colorDiff = endColor.sub(startColor);
        shots.forEach(sh => {
            const fromStation = stations.get(sh.from);
            const toStationName = (sh.type === 'splay') ? Survey.getSplayStationName(surveyName, sh.id) : sh.to;
            const toStation = stations.get(toStationName);
            if (fromStation !== undefined && toStation !== undefined) {
                const fromD = maxZ - fromStation.position.z;
                const toD = maxZ - toStation.position.z;
                const fc = startColor.add(colorDiff.mul(fromD / diffZ));
                const tc = startColor.add(colorDiff.mul(toD / diffZ));
                if (sh.type === 'center') {
                    centerColors.push(fc.r, fc.g, fc.b, tc.r, tc.g, tc.b);
                } else if (sh.type === 'splay') {
                    splayColors.push(fc.r, fc.g, fc.b, tc.r, tc.g, tc.b);
                }
            }
        });
        return { center: centerColors, splays: splayColors };
    }
}