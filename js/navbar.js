import { IcosahedronGeometry } from "three";

export function addNavbarClickListener() {
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
export function buildNavbar(navbarHtmlElement, menus, icons) {
    const createMenu = (name, elements) => {
        const c = document.createElement('div');
        c.setAttribute("class", "mydropdown-content");
        c.setAttribute("id", "myDropdown");

        elements.forEach((e) => {
            const a = document.createElement('a');
            a.appendChild(document.createTextNode(e.name))
            a.onclick = e.click;
            c.appendChild(a);
            //c.appendChild(document.createElement('br'));
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

    const createIcon = (tooltip, glyphName, click) => {
        const a = document.createElement('a');
        a.onclick = click;
        const i = document.createElement('i');
        i.setAttribute("class", `glyphicon glyphicon-${glyphName}`);
        const t = document.createElement('span');
        t.setAttribute("class", "mytooltiptext")
        t.appendChild(document.createTextNode(tooltip));
        a.appendChild(i);
        a.appendChild(t);
        a.setAttribute("class", "mytooltip");
        return a;
    };

    navbarHtmlElement.innerHTML = '';
    menus.forEach((m) => navbarHtmlElement.appendChild(createMenu(m.name, m.elements)));
    icons.forEach((i) => {navbarHtmlElement.appendChild(createIcon(i.tooltip, i.glyphName, i.click))});
};
