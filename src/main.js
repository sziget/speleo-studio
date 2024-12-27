import { Database } from './db.js';
import { MyScene } from './scene/scene.js';
import { PlySurfaceImporter, PolygonImporter, TopodroidImporter, JsonImporter } from './io/import.js';
import { SceneInteraction } from './interactive.js';
import { OPTIONS } from './config.js';
import { MATERIALS } from './materials.js';
import { ProjectExplorer, ProjectManager } from './ui/explorer.js';
import { NavigationBar } from './ui/navbar.js';
import { Footer } from './ui/footer.js';
import { addGui } from './ui/controls.js';
import { SurveyEditor as Editor } from './ui/surveyeditor.js';
import { AttributesDefinitions, attributeDefintions } from './attributes.js';

class Main {

  constructor() {
    const db = new Database();
    const options = OPTIONS;
    const materials = MATERIALS;
    const attributeDefs = new AttributesDefinitions(attributeDefintions);
    const scene = new MyScene(options, db, materials);
    new NavigationBar(db, document.getElementById('navbarcontainer'), options, scene);
    const footer = new Footer(document.getElementById('footer'));
    const editor = new Editor(
      scene,
      db,
      attributeDefs,
      document.getElementById('surveydatapanel'),
      document.getElementById('surveydatapanel-close'),
      document.getElementById('surveydatapanel-update')
    );
    const explorer = new ProjectExplorer(options, db, scene, editor, document.querySelector('#tree-panel'));
    new ProjectManager(db, options, scene, explorer);
    const controls = addGui(options, scene, materials, document.getElementById('guicontrols'));
    controls.close();
    new SceneInteraction(
      options,
      footer,
      scene,
      materials,
      scene.domElement,
      document.getElementById('getdistance'),
      document.getElementById('contextmenu'),
      document.getElementById('infopanel')
    );
    this.scene = scene;
    this.importers = {
      topodroid : new TopodroidImporter(db, options, scene, explorer),
      polygon   : new PolygonImporter(db, options, scene, explorer),
      json      : new JsonImporter(db, options, scene, explorer, attributeDefs),
      ply       : new PlySurfaceImporter(db, options, scene)
    };

    this.#setupEventListeners();
    this.#loadCaveFromUrl();
  }

  #setupEventListeners() {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    this.#setupFileInputListener('topodroidInput', (file) => this.importers.topodroid.importFile(file));
    this.#setupFileInputListener('polygonInput', (file) => this.importers.polygon.importFile(file));
    this.#setupFileInputListener('jsonInput', (file) => this.importers.json.importFile(file));
    this.#setupFileInputListener('plyInput', (file) => this.importers.ply.importFile(file));

  }

  #setupFileInputListener(inputName, handler) {
    document
      .getElementById(inputName)
      .addEventListener('change', (e) => handler(e.target.files[0]));
  }

  #loadCaveFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('cave')) {
      const caveNameUrl = urlParams.get('cave');
      let importer;

      if (caveNameUrl.includes('.cave')) {
        importer = this.importers.polygon;
      } else if (caveNameUrl.includes('.csv')) {
        importer = this.importers.topodroid;
      } else if (caveNameUrl.includes('.json')) {
        importer = this.importers.json;
      }

      if (importer !== undefined) {
        fetch(caveNameUrl)
          .then((data) => data.blob())
          .then((res) => importer.importFile(res))
          .catch((error) => console.error(error));
      }
    } else {
      this.scene.renderScene();
    }
  }
}

export { Main };
