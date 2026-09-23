import * as THREE from "three";

export interface SpatialModel {
  root: THREE.Group;
  targets: THREE.Object3D[];
  states: number;
  state: (index: number) => void;
  update: (
    time: number,
    delta: number,
    expansion: number,
    immediate: boolean,
  ) => void;
}

/** Original geometric illustrations, not training measurements or architecture claims. */
export function createSpatialModel(
  variant: string,
  orange: boolean,
): SpatialModel {
  const root = new THREE.Group();
  const targets: THREE.Object3D[] = [];
  const ink = new THREE.MeshStandardMaterial({
    color: orange ? "#151515" : "#ff712e",
    metalness: 0.46,
    roughness: 0.27,
  });
  const white = new THREE.MeshStandardMaterial({
    color: "#f5f5f2",
    metalness: 0.72,
    roughness: 0.19,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#333333",
    metalness: 0.7,
    roughness: 0.3,
  });
  const line = new THREE.LineBasicMaterial({
    color: orange ? "#242424" : "#ff8b50",
    transparent: true,
    opacity: 0.42,
  });
  let selected = 0;
  const dummy = new THREE.Object3D();

  if (variant === "training") {
    const count = 1152;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.066, 0.066, 0.066),
      ink,
      count,
    );
    const positions = new Float32Array(count * 3);
    root.add(mesh);
    function point(index: number, state: number): [number, number, number] {
      const u = ((index % 48) / 48) * Math.PI * 2,
        v = (Math.floor(index / 48) / 24) * Math.PI * 2;
      if (state === 1) {
        const y = 1 - (2 * (index + 0.5)) / count,
          r = Math.sqrt(1 - y * y),
          a = index * 2.39996323;
        return [r * Math.cos(a) * 1.8, y * 1.8, r * Math.sin(a) * 1.8];
      }
      if (state === 2) {
        const a = u * 2,
          r = 0.95 + 0.27 * Math.cos(v);
        return [
          r * Math.cos(a),
          ((index % 48) / 47) * 3.25 - 1.625 + 0.27 * Math.sin(v),
          r * Math.sin(a),
        ];
      }
      if (state === 3) {
        const r = 1.12 + 0.38 * Math.cos(3 * u) + 0.18 * Math.cos(v);
        return [
          r * Math.cos(2 * u),
          r * Math.sin(2 * u),
          0.62 * Math.sin(3 * u) + 0.18 * Math.sin(v),
        ];
      }
      const r = 1.22 + 0.52 * Math.cos(v);
      return [r * Math.cos(u), r * Math.sin(u), 0.52 * Math.sin(v)];
    }
    for (let i = 0; i < count; i++) {
      positions.set(point(i, 0), i * 3);
      mesh.setColorAt(i, new THREE.Color(i % 11 === 0 ? "#ffffff" : "#ff8b59"));
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return {
      root,
      targets,
      states: 4,
      state: (i) => {
        selected = i % 4;
      },
      update: (time, dt, spread, immediate) => {
        const blend = immediate ? 1 : 1 - Math.exp(-dt * 5);
        for (let i = 0; i < count; i++) {
          const p = point(i, selected);
          for (let axis = 0; axis < 3; axis++)
            positions[i * 3 + axis] +=
              (p[axis] * (1 + spread * 0.22) - positions[i * 3 + axis]) * blend;
          dummy.position.fromArray(positions, i * 3);
          dummy.rotation.set(time * 0.09 + i * 0.08, i * 0.1, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      },
    };
  }

  if (variant === "agents") {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 1), ink);
    root.add(core);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(core.geometry),
      new THREE.LineBasicMaterial({
        color: orange ? "#ffffff" : "#ffb485",
        transparent: true,
        opacity: 0.3,
      }),
    );
    core.add(wire);
    const orbits: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const orbit = new THREE.Group();
      orbit.rotation.set(i * 0.7, i * 0.72, 0.35);
      root.add(orbit);
      orbits.push(orbit);
      const points = Array.from(
        { length: 129 },
        (_, n) =>
          new THREE.Vector3(
            Math.cos((n / 128) * Math.PI * 2) * 1.8,
            Math.sin((n / 128) * Math.PI * 2) * 1.8,
            0,
          ),
      );
      orbit.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(points),
          line,
        ),
      );
      const token = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 16, 12),
        white,
      );
      orbit.add(token);
    }
    const nodes: THREE.Mesh[] = [];
    const coords = [
      [0, 1.8, 0],
      [1.8, 0, 0.3],
      [0, -1.8, 0],
      [-1.8, 0, -0.3],
    ];
    coords.forEach((p, i) => {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 28, 20),
        i === 0 ? white : ink,
      );
      node.position.fromArray(p);
      node.userData.state = i;
      targets.push(node);
      nodes.push(node);
      root.add(node);
    });
    return {
      root,
      targets,
      states: 4,
      state: (i) => {
        selected = i % 4;
        nodes.forEach((node, n) => {
          node.material = n === selected ? white : ink;
          node.scale.setScalar(n === selected ? 1.5 : 1);
        });
      },
      update: (time, _dt, spread) => {
        core.rotation.set(time * 0.14, time * 0.1, 0);
        orbits.forEach((orbit, i) => {
          orbit.scale.setScalar(1 + spread * 0.17);
          const token = orbit.children[1];
          const a = time * (0.26 + i * 0.09) + i * 2;
          token.position.set(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0);
        });
        nodes.forEach((node, i) =>
          node.position.fromArray(coords[i]).multiplyScalar(1 + spread * 0.17),
        );
      },
    };
  }

  const forms = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  forms.forEach((form, i) => {
    form.visible = i === 0;
    root.add(form);
  });
  const slabs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.18, 1.6),
      i % 2 ? white : ink,
    );
    slab.position.y = (i - 2) * 0.47;
    slab.rotation.y = i * 0.2;
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(slab.geometry),
      line,
    );
    slab.add(edge);
    forms[0].add(slab);
    slabs.push(slab);
  }
  forms[0].rotation.set(0.2, 0.1, -0.16);
  const satellites: THREE.Mesh[] = [];
  const triangle: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 2;
    const p = new THREE.Vector3(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0);
    triangle.push(p);
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.52, 0),
      i === 1 ? white : ink,
    );
    node.position.copy(p);
    forms[1].add(node);
    satellites.push(node);
  }
  forms[1].add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(triangle),
      line,
    ),
  );
  forms[1].add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), white));
  const blocks: THREE.Mesh[] = [];
  const box = new THREE.BoxGeometry(0.3, 1, 0.3);
  for (let i = 0; i < 49; i++) {
    const b = new THREE.Mesh(
      box,
      i % 7 === 3 ? white : i % 3 === 0 ? dark : ink,
    );
    b.position.set(((i % 7) - 3) * 0.39, 0, (Math.floor(i / 7) - 3) * 0.39);
    forms[2].add(b);
    blocks.push(b);
  }
  forms[2].rotation.set(0.25, -0.4, 0);
  return {
    root,
    targets,
    states: 3,
    state: (i) => {
      selected = i % 3;
      forms.forEach((f, n) => (f.visible = n === selected));
    },
    update: (time, _dt, spread) => {
      slabs.forEach((slab, i) => {
        slab.position.y = (i - 2) * (0.47 + spread * 0.15);
        slab.rotation.y = i * 0.2 + Math.sin(time * 0.35 + i * 0.4) * 0.16;
      });
      satellites.forEach((node, i) => {
        node.rotation.set(time * 0.2 + i, time * 0.15, 0);
      });
      blocks.forEach((block, i) => {
        block.scale.y =
          0.25 +
          (Math.sin(time * 0.85 + (i % 7) * 0.55 + Math.floor(i / 7) * 0.4) +
            1) *
            0.62;
        block.position.y = block.scale.y / 2 - 0.5;
        block.position.x = ((i % 7) - 3) * (0.39 + spread * 0.07);
        block.position.z = (Math.floor(i / 7) - 3) * (0.39 + spread * 0.07);
      });
    },
  };
}
