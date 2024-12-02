import * as U from "./utils.js";
import * as M from "./model.js";

export function getStationsAndSplaysPolygon(surveyData, stationsFromPreviousSurveys) {
    const stationsSegments = [];
    const start = new M.Vector(0, 0, 0);
    const stations = new Map();
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
        const polarVector = U.fromPolar(distance, U.degreesToRads(90 + azimuth), U.degreesToRads(clino));
        const stationFrom = stations.has(from) ? stations.get(from) : stationsFromPreviousSurveys.get(from);
        const stationTo = new M.Vector(stationFrom.x, stationFrom.y, stationFrom.z).add(polarVector);

        if (!stations.has(to)) {
            stations.set(to, stationTo);
        }

        stationsSegments.push(stationFrom.x, stationFrom.y, stationFrom.z, stationTo.x, stationTo.y, stationTo.z);

    }

    return [stations, stationsSegments]
}

export function getStationsAndSplays(csvData) {
    const stationsPoints = [];
    const splays = []
    const start = new M.Vector(0, 0, 0);
    const stations = new Map();
    stations.set('Plm0@Plöm_plöm', start);


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
        const polarVector = U.fromPolar(distance, U.degreesToRads(90 + azimuth), U.degreesToRads(clino));
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

    return [stations, stationsPoints, splays]
}

