import * as THREE from 'three';

export class EventListener {

    constructor(control, orbit, currentCamera, cameraPersp, cameraOrtho, resizeFn) {
        this.control = control;
        this.orbit = orbit;
        this.currentCamera = currentCamera;
        this.cameraPersp = cameraPersp;
        this.cameraOrtho = cameraOrtho;
        this.resizeFn = resizeFn;
    }

    keyUpListener(event) {
        switch (event.key) {

            case 'Shift':
                this.control.setTranslationSnap(null);
                this.control.setRotationSnap(null);
                this.control.setScaleSnap(null);
                break;

        }
    }

    keyDownListener(event) {
        
        switch (event.key) {

            case 'q':
                this.control.setSpace(this.control.space === 'local' ? 'world' : 'local');
                break;

            case 'Shift':
                this.control.setTranslationSnap(1);
                this.control.setRotationSnap(THREE.MathUtils.degToRad(15));
                this.control.setScaleSnap(0.25);
                break;

            case 'w':
                this.control.setMode('translate');
                break;

            case 'e':
                this.control.setMode('rotate');
                break;

            case 'r':
                this.control.setMode('scale');
                break;

            case 'c':
                const position = this.currentCamera.position.clone();

                this.currentCamera = this.currentCamera.isPerspectiveCamera ? this.cameraOrtho : this.cameraPersp;
                this.currentCamera.position.copy(position);
                this.orbit.object = this.currentCamera;
                this.control.camera = this.currentCamera;

                this.currentCamera.lookAt(this.orbit.target.x, this.orbit.target.y, this.orbit.target.z);
                this.resizeFn();
                break;

            case 'v':
                const randomFoV = Math.random() + 0.1;
                const randomZoom = Math.random() + 0.1;

                this.cameraPersp.fov = randomFoV * 160;
                this.cameraOrtho.bottom = - randomFoV * 500;
                this.cameraOrtho.top = randomFoV * 500;

                this.cameraPersp.zoom = randomZoom * 5;
                this.cameraOrtho.zoom = randomZoom * 5;
                this.resizeFn();
                break;

            case '+':
            case '=':
                this.control.setSize(this.control.size + 0.1);
                this.resizeFn();
                break;

            case '-':
            case '_':
                this.control.setSize(Math.max(this.control.size - 0.1, 0.1));
                this.resizeFn();
                break;

            case 'x':
                this.control.showX = !this.control.showX;
                break;

            case 'y':
                this.control.showY = !this.control.showY;
                break;

            case 'z':
                this.control.showZ = !this.control.showZ;
                break;

            case ' ':
                this.control.enabled = !this.control.enabled;
                break;

            case 'Escape':
                this.control.reset();
                break;

        }

    }
}