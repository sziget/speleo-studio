class Database {

    constructor() {
        this.caves = new Map();
        this.surfaces = new Map();
    }

    deleteSurvey(caveName, surveyName) {
        if (this.caves.has(caveName)) {
            const cave = this.caves.get(caveName);
            const survey = cave.surveys.find(s => s.name === surveyName)
            const indexToDelete = cave.surveys.indexOf(survey);
            if (indexToDelete !== -1) {
                cave.surveys.splice(indexToDelete, 1);
                const event = new CustomEvent("surveyDeleted", {
                    detail: {
                        cave: caveName,
                        survey: surveyName
                    }
                });
                document.dispatchEvent(event);
            }
        }
    }

    /**
     * Returns all the surveys for all caves
     * @returns {Array[Survey]} Surveys of all caves
     */
    getAllSurveys() {
        return this.caves.values().flatMap(c => c.surveys);
    }

    addCave(cave) {
        this.caves.set(cave.name, cave);
    }

    getSurface(name) {
        this.surfaces.get(name);
    }

    addSurface(surface) {
        if (this.surfaces.has(surface.name)) {
            throw new Error(`Surface ${surface.name} has already been added!`);
        }
        this.surfaces.set(surface.name, surface);
    }

    deleteCave(caveName) {
        if (this.caves.has(caveName)) {
            this.caves.delete(caveName);
            const event = new CustomEvent("caveDeleted", {
                detail: {
                    cave: caveName
                }
            });
            document.dispatchEvent(event);
        }
    }

}

export { Database };