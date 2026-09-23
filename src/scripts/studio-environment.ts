import * as THREE from "three";

/** Original neutral studio softboxes. No external HDRI or textures. */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color("#181818");
  const panels = [
    { position: [-3, 4, 3], size: [2.8, 7], power: 5 },
    { position: [4, 1, 2], size: [1.5, 6], power: 3.5 },
    { position: [0, -4, 1], size: [5, 1.5], power: 2.5 },
    { position: [1, 3, -4], size: [3.5, 3], power: 4 },
    { position: [0, 2, 6], size: [7, 2], power: 1.4 },
  ];
  for (const panel of panels) {
    const light = new THREE.Mesh(
      new THREE.PlaneGeometry(...(panel.size as [number, number])),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setScalar(panel.power),
        side: THREE.DoubleSide,
      }),
    );
    light.position.fromArray(panel.position);
    light.lookAt(0, 0, 0);
    studio.add(light);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.025, 0.1, 30, { size: 128 });
  pmrem.dispose();
  studio.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  return environment;
}
