class Vector {

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(v) {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v) {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(d) {
    return new Vector(this.x * d, this.y * d, this.z * d);
  }

  distanceTo(v) {
    const dx = this.x - v.x,
      dy = this.y - v.y,
      dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  toExport() {
    return {
      x : this.x,
      y : this.y,
      z : this.z
    };
  }

  static fromPure(pure) {
    return Object.assign(new Vector(), pure);
  }
}

class Color {

  constructor(r, g, b) {
    if (typeof r === 'number' && g === undefined && b === undefined) {
      this._hex = Math.floor(r);
      this.r = ((this._hex >> 16) & 255) / 255;
      this.g = ((this._hex >> 8) & 255) / 255;
      this.b = (this._hex & 255) / 255;
    } else if (typeof r === 'string' && r.startsWith('#') && g === undefined && b === undefined) {
      this._hex = parseInt(r.substring(1), 16);
      this.r = ((this._hex >> 16) & 255) / 255;
      this.g = ((this._hex >> 8) & 255) / 255;
      this.b = (this._hex & 255) / 255;
    } else {
      this.r = r;
      this.g = g;
      this.b = b;
      this._hex = (1 << 24) + (r << 16) + (g << 8) + b;
    }
  }

  hex() {
    return this._hex;
  }

  hexString() {
    return '#'.concat(('000000' + this._hex.toString(16)).slice(-6));
  }

  add(c) {
    return new Color(this.r + c.r, this.g + c.g, this.b + c.b);
  }

  sub(c) {
    return new Color(this.r - c.r, this.g - c.g, this.b - c.b);
  }

  mul(d) {
    return new Color(this.r * d, this.g * d, this.b * d);
  }
}

class Shot {
  export_fields = ['id', 'type', 'from', 'to', 'length', 'azimuth', 'clino'];

  constructor(id, type, from, to, length, azimuth, clino) {
    this.id = id;
    this.type = type;
    this.from = from;
    this.to = to;
    this.length = length;
    this.azimuth = azimuth;
    this.clino = clino;
    this.processed = false;
  }

  isSplay() {
    return this.type === 'splay';
  }

  isCenter() {
    return this.type === 'center';
  }

  toExport() {
    let newShot = {};
    this.export_fields.forEach((fName) => {
      newShot[fName] = this[fName];
    });
    return newShot;
  }
}

class SurveyStartStation {

  /**
   * Represents the start point, the first station of whole survey
   *
   * @param {string} name - The name of the starting point for this survey
   * @param {SurveyStation} station - The start position and type of the starting point
   */
  constructor(name, station) {
    this.name = name;
    this.station = station;
  }

  toExport() {
    return {
      name    : this.name,
      station : this.station.toExport()
    };
  }

  static fromPure(pure) {
    pure.station = SurveyStation.fromPure(pure.station);
    return Object.assign(new SurveyStartStation(), pure);
  }
}

class CaveSection {

  constructor(from, to, path, distance) {
    this.from = from;
    this.to = to;
    this.path = path;
    this.distance = distance;
  }

  isComplete() {
    return this.from !== undefined &&
      this.to !== undefined &&
      this.path !== undefined &&
      this.path.length > 0 &&
      this.path.distance !== undefined &&
      this.path.distance !== Infinity;
  }

  toExport() {
    return {
      from : this.from,
      to   : this.to
    };
  }

  static fromPure(pure) {
    return Object.assign(new CaveSection(), pure);
  }

}

class SectionAttribute {

  constructor(id, section, attribute, color, visible = false) {
    this.id = id;
    this.section = section;
    this.attribute = attribute;
    this.color = color;
    this.visible = visible;
  }

  isComplete() {
    return this.attribute !== undefined &&
      typeof this.attribute === 'object' &&
      this.section !== undefined &&
      this.section instanceof CaveSection &&
      this.section.isComplete;
  }

  toExport() {
    return {
      id        : this.id,
      section   : this.section.toExport(),
      attribute : this.attribute,
      color     : this.color.hexString(),
      visible   : this.visible
    };
  }

  static fromPure(pure, attributeDefs) {
    pure.attribute = attributeDefs.createFromPure(pure.attribute);
    pure.color = new Color(pure.color);
    pure.section = CaveSection.fromPure(pure.section);
    return Object.assign(new SectionAttribute(), pure);
  }
}

class StationAttribute {

  constructor(name, attribute) {
    this.name = name;
    this.attribute = attribute;
  }

  toExport() {
    return {
      name      : this.name,
      attribute : this.attribute
    };
  }
}

class SurveyStation {

  /**
   *
   * @param {string} type - the type of the station, could be center and splay
   * @param {Vector} position - the 3D vector representing the position of the station
   * @param {Survey} survey - the survey that this station belongs to
   */
  constructor(type, position, survey) {
    this.type = type;
    this.position = position;
    this.survey = survey;
  }

  isCenter() {
    return this.type === 'center';
  }

  isSplay() {
    return this.type === 'splay';
  }

  toExport() {
    return {
      type     : this.type,
      position : this.position.toExport()
    };
  }

  static fromPure(pure) {
    pure.position = Vector.fromPure(pure.position);
    return Object.assign(new SurveyStation(), pure);
  }
}

class Survey {

  /**
   *
   * @param {string} name - The name of the Survey
   * @param {boolean} visible
   * @param {SurveyStartStation} - The start point of the whole survey that was explicitly specified for a survey
   * @param {Array[Shot]} shots - An array of shots holding the measurements for this Survey
   * @param {Array[Number]} orphanShotIds - An array of orphan shots that are disconnected (from and/or to is unknown)
   * @param {Array[Object]} attributes - Extra attributes (e.g. tectonics information) associated to this Survey
   */
  constructor(name, visible = true, start = undefined, shots = [], orphanShotIds = new Set(), attributes = []) {
    this.name = name;
    this.visible = visible;
    this.start = start;
    this.shots = shots;
    this.orphanShotIds = orphanShotIds;
    this.attributes = attributes;
    this.isolated = false;
  }

  getSplayStationName(id) {
    return `splay-${id}@${this.name}`;
  }

  getFromStationName(shot) {
    return shot.fromAlias !== undefined ? shot.fromAlias : shot.from;
  }

  getToStationName(shot) {
    if (shot.isSplay()) {
      return this.getSplayStationName(shot.id);
    } else if (shot.toAlias !== undefined) {
      return shot.toAlias;
    } else {
      return shot.to;
    }
  }

  /**
   * Returns all the attributes with the given name for all stations
   *
   * @param {string} name - The name an attribute, see attribute definitons for more information.
   * @returns {Array[Array[Vector, Object]]>} - Attribute params with 3D position
   */
  getAttributesWithPositionsByName(stations, name) {
    return (
      this.attributes
        .filter((sa) => sa.attribute.name === name)
        .map((sa) => {
          const pos = stations.get(sa.name).position;
          return [pos, sa.attribute];

        })
    );
  }

  toExport() {
    return {
      name       : this.name,
      start      : this.start.toExport(),
      attributes : this.attributes.map((sta) => sta.toExport()),
      shots      : this.shots.map((s) => s.toExport())
    };
  }

  static fromPure(pure, attributeDefs) {
    if (pure.start !== undefined) {
      pure.start = SurveyStartStation.fromPure(pure.start);
    }
    pure.attributes = pure.attributes
      .map((a) => new StationAttribute(a.name, attributeDefs.createFromPure(a.attribute)));
    pure.shots = pure.shots.map((s) => Object.assign(new Shot(), s));
    return Object.assign(new Survey(), pure);
  }

}

class SurveyAlias {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  contains(n) {
    return this.from === n || this.to === n;
  }

  getPair(n) {
    if (this.from === n) {
      return this.to;
    } else if (this.to === n) {
      return this.from;
    } else {
      return undefined;
    }
  }

  toExport() {
    return {
      from : this.from,
      to   : this.to
    };
  }

  static fromPure(pure) {
    return Object.assign(new SurveyAlias(), pure);
  }
}

class Surface {
  /**
   *
   * @param {string} name - The name of the surface
   * @param {Array[Vector]} points - The points that define the surface
   * @param {Vector} center - The center of the surface bounding box
   * @param {boolean} visible - The visibility property of the surface
   */
  constructor(name, points = [], center, visible = true) {
    this.name = name;
    this.points = points;
    this.center = center;
    this.visible = visible;
  }

}
class CaveMetadata {

  constructor(settlement, catasterCode, date) {
    this.settlement = settlement;
    this.catasterCode = catasterCode;
    this.date = date;
  }

  toExport() {
    return {
      settlement   : this.settlement,
      catasterCode : this.catasterCode,
      date         : this.date.getTime()
    };
  }

  static fromPure(pure) {
    pure.date = new Date(pure.date); // unix epoch in millis
    return Object.assign(new CaveMetadata(), pure);
  }
}

class Cave {
  /**
   *
   * @param {string} name - The name of the cave
   * @param {CaveMetadata} metaData - Additional information about the cave, like the settlement
   * @param {Vector} startPosition - The start position of the cave that is defined by the first survey
   * @param {Map<string, SurveyStation>} stations - The merged map of all survey stations
   * @param {Survey[]} surveys - The surveys associated to a cave
   * @param {SurveyAlias[]} - Mapping of connection point between surveys
   * @param {boolean} visible - The visibility property of a cave
   */
  constructor(
    name,
    metaData,
    startPosition,
    stations = new Map(),
    surveys = [],
    aliases = [],
    sectionAttributes = [],
    visible = true
  ) {
    this.name = name;
    this.metaData = metaData;
    this.startPosition = startPosition;
    this.stations = stations;
    this.surveys = surveys;
    this.aliases = aliases;
    this.sectionAttributes = sectionAttributes;
    this.visible = visible;
  }

  getStats() {
    var length = 0;
    var orphanLength = 0;
    var isolated = 0;
    var surveys = 0;
    var attributes = 0;

    this.surveys.forEach((survey) => {
      surveys += 1;
      attributes += survey.attributes.length;

      if (survey.isolated === true) {
        isolated += 1;
      }
      survey.shots.forEach((shot) => {
        length += shot.length;
        if (survey.orphanShotIds.has(shot.id)) {
          orphanLength += shot.length;
        }
      });
    });
    const stations = [...this.stations.values()];
    var minZ, maxZ, minZSplay, maxZSplay;

    stations.forEach((ss) => {
      const zCoord = ss.position.z;

      if (ss.isCenter()) {
        if (zCoord < minZ || minZ === undefined) {
          minZ = zCoord;
        }
        if (zCoord > maxZ || maxZ === undefined) {
          maxZ = zCoord;
        }
      } else if (ss.isSplay()) {
        if (zCoord < minZSplay || minZSplay === undefined) {
          minZSplay = zCoord;
        }
        if (zCoord > maxZSplay || maxZSplay === undefined) {
          maxZSplay = zCoord;
        }

      }
    });

    const verticalSplays = maxZSplay - minZSplay;

    return {
      stations            : stations.filter((ss) => ss.isCenter()).length,
      attributes          : attributes,
      surveys             : surveys,
      isolated            : isolated,
      length              : length,
      orphanLength        : orphanLength,
      depth               : this.startPosition.z - minZ,
      height              : maxZ - this.startPosition.z,
      vertical            : maxZ - minZ,
      vertiicalWithSplays : isNaN(verticalSplays) ? 0 : verticalSplays
    };
  }

  toExport() {
    return {
      name              : this.name,
      metaData          : this.metaData.toExport(),
      startPosition     : this.startPosition,
      aliases           : this.aliases.map((a) => a.toExport()),
      sectionAttributes : this.sectionAttributes.map((sa) => sa.toExport()),
      surveys           : this.surveys.map((s) => s.toExport())
    };
  }

  static fromPure(pure, attributeDefs) {
    if (pure.metaData !== undefined) {
      pure.metaData = CaveMetadata.fromPure(pure.metaData);
    }
    pure.surveys = pure.surveys.map((s) => Survey.fromPure(s, attributeDefs));
    pure.aliases = pure.aliases === undefined ? [] : pure.aliases.map((a) => SurveyAlias.fromPure(a));
    pure.startPosition = Vector.fromPure(pure.startPosition);
    pure.sectionAttributes =
      pure.sectionAttributes === undefined
        ? []
        : pure.sectionAttributes.map((sa) => SectionAttribute.fromPure(sa, attributeDefs));
    return Object.assign(new Cave(), pure);
  }
}

export {
  Vector,
  Color,
  Shot,
  SurveyStartStation,
  StationAttribute,
  CaveSection,
  SectionAttribute,
  SurveyStation,
  Survey,
  SurveyAlias,
  Surface,
  CaveMetadata,
  Cave
};
