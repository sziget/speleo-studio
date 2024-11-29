import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';


const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 0, -100);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();

const red = new THREE.LineBasicMaterial({ color: 0xff0000 });
const green = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const blue = new THREE.LineBasicMaterial({ color: 0x0000ff });
const material = new THREE.LineBasicMaterial({ color: 0x0000ff });


function fromPolar(distance, azimuth, clino) {
    return new THREE.Vector3(
        Math.cos(azimuth) * Math.cos(clino) * distance,
        Math.sin(azimuth) * Math.cos(clino) * distance,
        Math.sin(clino) * distance
    );
}

const degreesToRads = deg => (deg * Math.PI) / 180.0;

const orbit = new THREE.Vector3(0, 0, 0);

scene.add( new THREE.GridHelper( 100, 10, 0x888888, 0x444444 ) );

scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([orbit, new THREE.Vector3(20, 0, 0)]), red));  // x axis
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([orbit, new THREE.Vector3(0, 20, 0)]), blue)); // y axis
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([orbit, new THREE.Vector3(0, 0, 20)]), green)); // z axis

const positions = [];
positions.push(-10, 0, 0, -100, 10, 0);

const matLine = new LineMaterial({
    color: 0xffffff,
    linewidth: 1, // in world units with size attenuation, pixels otherwise
    worldUnits: false,
    vertexColors: false,
    alphaToCoverage: false,
});

renderer.render(scene, camera);

function animate() {
    controls.update();
    renderer.render(scene, camera);
}



document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: false,
            comments: "#",
            dynamicTyping: true,
            complete: function (results) {
                const stationsPoints = [];
                const splays = []
                const start = new THREE.Vector3(0, 0, 0);
                const stations = new Map();
                stations.set('Plm0@Plöm_plöm', start);


                for (let i = 0; i < results.data.length; i++) {
                    const row = results.data[i];
                    if (row === null || row.length != 8) {
                        continue;
                    }
                    const from = row[0];
                    const to = row[1];
                    const distance = row[2];
                    const azimuth = row[3];
                    const clino = row[4];
                    const polarVector = fromPolar(distance, degreesToRads(90 + azimuth), degreesToRads(clino));
                    const stationFrom = stations.get(from);
                    const stationTo = new THREE.Vector3(stationFrom.x, stationFrom.y, stationFrom.z).add(polarVector);

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


                const geometryStations = new LineSegmentsGeometry();
                geometryStations.setPositions(stationsPoints);
                const polygonSegments = new LineSegments2(geometryStations, matLine);
                scene.add(polygonSegments);

                // const splaysGeometry = new LineSegmentsGeometry();
                // splaysGeometry.setPositions(splays);
                // const segmentsSplays = new LineSegments2( splaysGeometry, matLine );
                // scene.add( segmentsSplays );

                renderer.render(scene, camera);

            },
            error: function (error) {
                console.error('Error parsing CSV:', error);
            }
        });
    }
});