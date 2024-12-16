import { MyScene } from "./scene.js";

export class NavigationBar {

    /**
     * 
     * @param {HTMLElement} domElement - The HTML DOM element of the navigation bar
     * @param {Map<String, Map>} options - Global project options, like global visibility of an object
     * @param {MyScene} scene - The 3D scene
     */
    constructor(domElement, options, scene) {
        this.options = options;
        this.scene = scene;
        this.#buildNavbar(domElement);
        this.#addNavbarClickListener();
    }

    #getMenus() {
        return [
            {
                "name": "File", elements: [
                    { "name": "Open TopoDroid file", "click": function () { document.getElementById('topodroidInput').click(); } },
                    { "name": "Open Polygon file", "click": function () { document.getElementById('polygonInput').click(); } }
                ]
            }
        ]
    }

    #getIcons() {
        return [
            {
                "tooltip": "Zoom to fit", "glyphName": "fullscreen", "click": () => this.scene.fitScene()
            },
            {
                "tooltip": "Zoom in", "glyphName": "zoom-in", "click": () => this.scene.zoomWithStep(this.options.scene.zoomStep)
            },
            {
                "tooltip": "Zoom out", "glyphName": "zoom-out", "click": () => this.scene.zoomWithStep(-1 * this.options.scene.zoomStep)
            },
            {
                "tooltip": "Plan", "icon": "/icons/plan.svg", "click": () => this.scene.lookAtPlan()
            },
            {
                "tooltip": "Profile", "icon": "/icons/profile.svg", "click": () => this.scene.lookAtProfile()
            },
            {
                "tooltip": "Bounding box", "icon": "/icons/bounding_box.svg", "click": () => this.scene.toogleBoundingBox()
            },
            {
                "tooltip": "Show beddings", "icon": "/icons/bedding.svg", "click": () => this.scene.tooglePlaneFor("bedding")
            },
            {
                "tooltip": "Show faults", "icon": "/icons/fault.svg", "click": () => this.scene.tooglePlaneFor("fault")
            },
            {
                "tooltip": "Center line color mode", "icon": "/icons/cl_color.svg", "click": () => this.scene.rotateCenterLineColor()
            },
        ]
    }

    #addNavbarClickListener() {
        //Close the dropdown if the user clicks outside of it
        window.onclick = function (e) {
            if (!e.target.matches('.dropbtn')) {
                document.querySelectorAll('.mydropdown-content').forEach((c) => {
                    if (c.classList.contains('mydropdown-show')) {
                        c.classList.remove('mydropdown-show');
                    }
                });
            }
        }
    }

    #buildNavbar(navbarHtmlElement) {
        const createMenu = (name, elements) => {
            const c = document.createElement('div');
            c.setAttribute("class", "mydropdown-content");
            c.setAttribute("id", "myDropdown");

            elements.forEach((e) => {
                const a = document.createElement('a');
                a.appendChild(document.createTextNode(e.name))
                a.onclick = e.click;
                c.appendChild(a);
            });

            const d = document.createElement('div');
            d.setAttribute("class", "mydropdown")
            const b = document.createElement('button');
            b.setAttribute("class", "dropbtn");
            b.onclick = function () {
                c.classList.toggle("mydropdown-show");
                document.querySelectorAll('.mydropdown-content').forEach((element) => {
                    if (element !== c) {
                        element.classList.remove('mydropdown-show'); // hide other visible menu elements
                    }
                });
            };
            b.appendChild(document.createTextNode(name));
            d.appendChild(b);
            d.appendChild(c);
            return d;
        };

        const createIcon = (tooltip, icon, glyphName, click) => {
            const a = document.createElement('a');
            a.onclick = click;

            if (glyphName !== undefined) {
                const i = document.createElement('i');
                i.setAttribute("class", `glyphicon glyphicon-${glyphName}`);
                a.appendChild(i);
            } else if (icon !== undefined) {
                const img = document.createElement('img');
                img.setAttribute("src", icon);
                img.setAttribute("width", "20");
                img.setAttribute("height", "20");
                a.appendChild(img);
            }

            const t = document.createElement('span');
            t.setAttribute("class", "mytooltiptext")
            t.appendChild(document.createTextNode(tooltip));

            a.appendChild(t);
            a.setAttribute("class", "mytooltip");
            return a;
        };

        navbarHtmlElement.innerHTML = '';
        this.#getMenus().forEach((m) => navbarHtmlElement.appendChild(createMenu(m.name, m.elements)));
        this.#getIcons().forEach((i) => { navbarHtmlElement.appendChild(createIcon(i.tooltip, i.icon, i.glyphName, i.click)) });
    }
}


