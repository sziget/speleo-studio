import * as THREE from 'three';

class GridHelper extends THREE.LineSegments {

	constructor(width = 100, height = 10, step = 10, opacity= 1.0) {

		const halfWidth = width / 2;
		const halfHeight = height / 2;
		let divisions = height / step;

		const vertices = [];

		vertices.push(- halfWidth, -halfHeight, 0, halfWidth, -halfHeight, 0);
		vertices.push(- halfWidth, halfHeight, 0, halfWidth, halfHeight, 0);
		vertices.push(- halfWidth, - halfHeight, 0, - halfWidth, halfHeight, 0);
		vertices.push(halfWidth, - halfHeight, 0, halfWidth, halfHeight, 0);

		for (let i = 0, k = - halfHeight; i <= divisions; i++, k += step) {
			vertices.push(- halfWidth, k, 0, halfWidth, k, 0);
		}
		divisions = width / step;

		for (let i = 0, k = - halfWidth; i <= divisions; i++, k += step) {
			vertices.push(k, -halfHeight, 0, k, halfHeight, 0);
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

		const matetrial = new THREE.LineBasicMaterial({
			color: 0xffffff,
			vertexColors: false,
			transparent: true,
			opacity: opacity
		});


		super(geometry, matetrial);

		this.type = 'GridHelper';

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

export { GridHelper };