import { CaveSection } from './model.js';
import { Graph } from './utils/graph.js';

class SectionHelper {

  static getSection(graph, from, to) {
    const path = graph.findShortestPath(from, to);
    if (path !== undefined) {
      return new CaveSection(from, to, path.path, path.distance);
    } else {
      return undefined;
    }
  }

  static getSegments(section, stations) {
    const segments = [];
    for (let index = 0; index < section.path.length - 1; index++) {
      const from = section.path[index];
      const to = section.path[index + 1];
      const fromSt = stations.get(from);
      const toSt = stations.get(to);
      const fromPos = fromSt.position;
      const toPos = toSt.position;
      if (fromPos !== undefined && toPos !== undefined) {
        segments.push(fromPos.x, fromPos.y, fromPos.z, toPos.x, toPos.y, toPos.z);
      }
    }
    return segments;
  }

  static getGraph(cave) {

    const g = new Graph();
    [...cave.stations.keys()].forEach((k) => g.addVertex(k));
    cave.surveys.forEach((s) => {
      s.validShots.forEach((sh) => {
        const fromName = s.getFromStationName(sh);
        const from = cave.stations.get(fromName);
        const toStationName = s.getToStationName(sh);
        const to = cave.stations.get(toStationName);
        if (from !== undefined && to !== undefined) {
          g.addEdge(fromName, toStationName, sh.length);
        }
      });
    });
    return g;
  }
}

export { SectionHelper };
