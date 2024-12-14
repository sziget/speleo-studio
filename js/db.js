import { attributeDb } from "./attributes.js";
export class Database {

    constructor() {
        this.caves = new Map();
        this.attributeDb = attributeDb;
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

    getAttributeIdByName(name) {
        return this.attributeDb.definitions.find(d => d.name === name).id;
    }

    getAttributeNameById(id) {
        return this.attributeDb.definitions.find(d => d.id === id).name;
    }
}