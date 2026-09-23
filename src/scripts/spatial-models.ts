import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
  toCreasedNormals,
} from "three/addons/utils/BufferGeometryUtils.js";

export interface SpatialModel {
  root: THREE.Group;
  targets: THREE.Object3D[];
  states: number;
  state: (index: number) => void;
  pointer?: (x: number, y: number) => void;
  update: (
    time: number,
    delta: number,
    expansion: number,
    immediate: boolean,
  ) => void;
}
const TAU = Math.PI * 2;
type Path = (u: number) => THREE.Vector3;

/** A flattened tube with continuous faces and edges. These original sculptures
 * are visual studies, not diagrams of model architecture. */
function ribbon(
  path: Path,
  width: number,
  twist: number,
  segments = 240,
  open = false,
) {
  const sides = 20,
    vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments,
      center = path(u);
    const tangent = path(u + 0.0001)
      .sub(path(u - 0.0001))
      .normalize();
    const radial = open
      ? new THREE.Vector3(center.x, 0, center.z)
      : new THREE.Vector3(center.x, center.y, 0);
    radial.addScaledVector(tangent, -radial.dot(tangent)).normalize();
    const normal = new THREE.Vector3()
      .crossVectors(tangent, radial)
      .normalize();
    const angle = u * TAU * twist;
    const a = radial
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(normal, Math.sin(angle));
    const b = new THREE.Vector3().crossVectors(tangent, a).normalize();
    for (let j = 0; j <= sides; j++) {
      const v = (j / sides) * TAU;
      const p = center
        .clone()
        .addScaledVector(a, Math.cos(v) * width)
        .addScaledVector(b, Math.sin(v) * 0.042);
      vertices.push(p.x, p.y, p.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  // One orange enamel edge; the broad faces remain silver.
  for (let j = 0; j < sides; j++) {
    const start = indices.length;
    for (let i = 0; i < segments; i++) {
      const a = i * (sides + 1) + j,
        b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    geometry.addGroup(
      start,
      indices.length - start,
      j === 0 || j === sides - 1 ? 1 : 0,
    );
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function roundedRect(width: number, height: number, r: number) {
  const p = new THREE.Shape(),
    x = -width / 2,
    y = -height / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + width - r, y);
  p.quadraticCurveTo(x + width, y, x + width, y + r);
  p.lineTo(x + width, y + height - r);
  p.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  p.lineTo(x + r, y + height);
  p.quadraticCurveTo(x, y + height, x, y + height - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

export function createSpatialModel(
  variant: string,
  orange: boolean,
): SpatialModel {
  const root = new THREE.Group(),
    targets: THREE.Object3D[] = [];
  const silver = new THREE.MeshPhysicalMaterial({
    color: "#dedede",
    metalness: 1,
    roughness: 0.23,
    clearcoat: 0.32,
    clearcoatRoughness: 0.24,
  });
  const enamel = new THREE.MeshPhysicalMaterial({
    color: "#ff5a12",
    metalness: 0.25,
    roughness: 0.26,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  });
  const graphite = new THREE.MeshPhysicalMaterial({
    color: "#606060",
    metalness: 0.8,
    roughness: 0.34,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
  });
  let selected = 0;

  if (variant === "training") {
    const paths: Path[] = [
      (u) => {
        const a = u * TAU;
        return new THREE.Vector3(
          (2 * Math.cos(a) + Math.cos(2 * a)) * 0.54,
          (2 * Math.sin(a) - Math.sin(2 * a)) * 0.54,
          Math.sin(3 * a) * 0.5,
        );
      },
      (u) => {
        const a = u * TAU,
          r = 1.25 + 0.24 * Math.cos(2 * a);
        return new THREE.Vector3(
          r * Math.cos(a),
          r * Math.sin(a),
          0.7 * Math.sin(2 * a),
        );
      },
      (u) => {
        const a = u * TAU,
          r = 1.16 + 0.28 * Math.cos(3 * a);
        return new THREE.Vector3(
          r * Math.cos(a),
          r * Math.sin(a),
          0.68 * Math.sin(3 * a),
        );
      },
      (u) => {
        const a = u * TAU,
          r = 1.07 + 0.35 * Math.cos(3 * a);
        return new THREE.Vector3(
          r * Math.cos(2 * a),
          r * Math.sin(2 * a),
          0.5 * Math.sin(3 * a),
        );
      },
    ];
    const geometries = paths.map((path) => ribbon(path, 0.32, 1));
    const shapes = geometries.map((g) =>
      Float32Array.from(g.getAttribute("position").array),
    );
    const geometry = geometries[0];
    geometries.slice(1).forEach((g) => g.dispose());
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    position.setUsage(THREE.DynamicDrawUsage);
    const sculpture = new THREE.Mesh(geometry, [silver, enamel]);
    sculpture.frustumCulled = false;
    sculpture.rotation.z = -0.32;
    root.add(sculpture);
    let dirty = true,
      previousSpread = -1;
    return {
      root,
      targets,
      states: 4,
      state: (i) => {
        selected = i % 4;
        dirty = true;
      },
      update: (time, delta, spread, immediate) => {
        if (dirty || Math.abs(spread - previousSpread) > 0.0001 || immediate) {
          const blend = immediate ? 1 : 1 - Math.exp(-delta * 3.2);
          const values = position.array,
            target = shapes[selected];
          let distance = 0;
          for (let i = 0; i < values.length; i++) {
            const d = target[i] * (1 + spread * 0.13) - values[i];
            values[i] += d * blend;
            distance = Math.max(distance, Math.abs(d));
          }
          position.needsUpdate = true;
          geometry.computeVertexNormals();
          dirty = distance > 0.0005;
          previousSpread = spread;
        }
        sculpture.rotation.z = -0.32 + Math.sin(time * 0.16) * 0.13;
        sculpture.position.y = Math.sin(time * 0.45) * 0.055;
      },
    };
  }

  if (variant === "agents") {
    const assembly = new THREE.Group();
    root.add(assembly);
    // Machined housing and eight individually pivoting iris leaves.
    const housing = new THREE.Shape();
    housing.absarc(0, 0, 1.78, 0, TAU, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 1.58, 0, TAU, true);
    housing.holes.push(hole);
    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(housing, {
        depth: 0.13,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 3,
        curveSegments: 96,
        steps: 1,
      }),
      [graphite, silver],
    );
    rim.position.z = -0.18;
    assembly.add(rim);
    const shape = new THREE.Shape();
    shape.moveTo(0.16, -0.11);
    shape.bezierCurveTo(-0.14, -0.66, -0.95, -1.07, -1.63, -0.55);
    shape.bezierCurveTo(-1.1, -0.43, -0.59, 0.24, 0.08, 0.18);
    shape.quadraticCurveTo(0.23, 0.11, 0.16, -0.11);
    const rawBlade = new THREE.ExtrudeGeometry(shape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 40,
      steps: 1,
    });
    const bladeGeometry = mergeVertices(rawBlade);
    rawBlade.dispose();
    const bladeVertices = bladeGeometry.getAttribute("position");
    for (let i = 0; i < bladeVertices.count; i++) {
      const x = bladeVertices.getX(i),
        y = bladeVertices.getY(i);
      bladeVertices.setZ(
        i,
        bladeVertices.getZ(i) +
          0.17 * Math.sin(((x + 1.64) / 1.9) * Math.PI) +
          y * y * 0.13,
      );
    }
    bladeGeometry.computeVertexNormals();
    const leaves: THREE.Group[] = [];
    for (let i = 0; i < 8; i++) {
      const pivot = new THREE.Group(),
        a = (i / 8) * TAU;
      pivot.position.set(Math.cos(a) * 1.33, Math.sin(a) * 1.33, i * 0.014);
      pivot.rotation.z = a;
      pivot.add(new THREE.Mesh(bladeGeometry, [graphite, silver]));
      leaves.push(pivot);
      assembly.add(pivot);
    }
    const ticks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.045, 0.006, 0.008),
      silver,
      72,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU;
      dummy.position.set(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.003);
      dummy.rotation.z = a;
      dummy.updateMatrix();
      ticks.setMatrixAt(i, dummy.matrix);
    }
    assembly.add(ticks);
    const markers = Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * TAU + Math.PI / 2;
      const marker = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.16, 4, 12),
        i === 0 ? enamel : silver,
      );
      marker.position.set(Math.cos(a) * 1.96, Math.sin(a) * 1.96, 0);
      marker.rotation.z = a;
      marker.userData.state = i;
      targets.push(marker);
      assembly.add(marker);
      return marker;
    });
    let aperture = 0.18;
    return {
      root,
      targets,
      states: 4,
      state: (i) => {
        selected = i % 4;
        markers.forEach((m, j) => {
          m.material = j === selected ? (orange ? graphite : enamel) : silver;
        });
      },
      update: (time, delta, spread, immediate) => {
        const target = [0.18, 0.55, 0.9, 0.34][selected] + spread * 0.45;
        aperture +=
          (target - aperture) * (immediate ? 1 : 1 - Math.exp(-delta * 4));
        leaves.forEach((leaf, i) => {
          leaf.rotation.z =
            (i / 8) * TAU + aperture + Math.sin(time * 0.55) * 0.035;
          leaf.position.z = i * 0.014 + spread * (i / 8) * 0.6;
        });
        assembly.rotation.z = -0.28 + Math.sin(time * 0.17) * 0.14;
      },
    };
  }

  const forms = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  forms.forEach((form, i) => {
    form.visible = i === 0;
    root.add(form);
  });
  const helix = new THREE.Mesh(
    ribbon(
      (u) => {
        const a = u * TAU * 2.4,
          r = 1.03 + Math.sin(u * Math.PI) * 0.17;
        return new THREE.Vector3(
          r * Math.cos(a),
          (u - 0.5) * 3.0,
          r * Math.sin(a),
        );
      },
      0.28,
      0.2,
      260,
      true,
    ),
    [silver, enamel],
  );
  helix.rotation.set(0.15, 0.1, -0.45);
  forms[0].add(helix);
  const linkShape = roundedRect(3.1, 1.75, 0.67);
  linkShape.holes.push(
    new THREE.Path(roundedRect(2.63, 1.28, 0.44).getPoints(24)),
  );
  const rawLink = new THREE.ExtrudeGeometry(linkShape, {
    depth: 0.065,
    bevelEnabled: true,
    bevelThickness: 0.068,
    bevelSize: 0.068,
    bevelSegments: 6,
    curveSegments: 40,
    steps: 1,
  });
  const linkGeometry = toCreasedNormals(rawLink, Math.PI / 3);
  if (linkGeometry !== rawLink) rawLink.dispose();
  linkGeometry.translate(0, 0, -0.0325);
  const links = [silver, enamel, silver].map((material, i) => {
    const mesh = new THREE.Mesh(linkGeometry, material);
    forms[1].add(mesh);
    if (i === 1) mesh.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    if (i === 2) mesh.rotation.set(0, Math.PI / 2, Math.PI / 2);
    return mesh;
  });
  forms[1].rotation.set(0.25, 0.2, -0.3);

  // A woven surface, animated on the GPU. Analytic displacement is also applied
  // to the normals so the highlights follow the moving filaments.
  const uniforms = {
    uTime: { value: 0 },
    uSpread: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
  };
  const wires: THREE.BufferGeometry[][] = [[], []];
  for (let i = 0; i < 44; i++) {
    const v = i / 43 - 0.5;
    const points = Array.from({ length: 81 }, (_, j) => {
      const x = (j / 80 - 0.5) * 3.75;
      return new THREE.Vector3(
        x,
        Math.sin(x * 1.6 + v * 2) * 0.46 + Math.cos(v * 5) * 0.22,
        v * 2.55,
      );
    });
    wires[i % 7 === 0 ? 1 : 0].push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        80,
        0.0105,
        5,
        false,
      ),
    );
  }
  [silver, enamel].forEach((base, i) => {
    const material = base.clone();
    material.roughness = 0.3;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader =
        `uniform float uTime; uniform float uSpread; uniform vec2 uPointer;
        float wave(vec3 p) { float d = length(p.xz - uPointer * 1.5);
          return sin(p.x * 2.0 + p.z * 1.4 - uTime * 0.8) * 0.16
            + cos(d * 3.5 - uTime) * exp(-d * 1.6) * 0.16; }\n` +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `
        #include <beginnormal_vertex>
        float w = wave(position);
        float dx = (wave(position + vec3(0.01,0.,0.)) - w) / 0.01;
        float dz = (wave(position + vec3(0.,0.,0.01)) - w) / 0.01;
        objectNormal = normalize(vec3(objectNormal.x - dx * objectNormal.y, objectNormal.y, objectNormal.z - dz * objectNormal.y));
      `,
        )
        .replace(
          "#include <begin_vertex>",
          `
        #include <begin_vertex>
        transformed.y += wave(position);
        transformed.z *= 1.0 + uSpread * 0.35;
      `,
        );
    };
    material.customProgramCacheKey = () => "dreamax-filament-v1";
    const geometry = mergeGeometries(wires[i]);
    wires[i].forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    forms[2].add(mesh);
  });
  forms[2].rotation.set(0.65, -0.18, -0.35);
  const pointerTarget = new THREE.Vector2();
  return {
    root,
    targets,
    states: 3,
    state: (i) => {
      selected = i % 3;
      forms.forEach((f, n) => {
        f.visible = n === selected;
      });
    },
    pointer: (x, y) => pointerTarget.set(x, y),
    update: (time, delta, spread, immediate) => {
      helix.rotation.y = time * 0.13;
      helix.scale.y = 1 + spread * 0.24;
      links.forEach((link, i) => {
        const a = (i * TAU) / 3;
        link.position.set(
          Math.cos(a) * spread * 0.5,
          Math.sin(a) * spread * 0.5,
          0,
        );
      });
      forms[1].rotation.y = 0.2 + Math.sin(time * 0.2) * 0.25;
      uniforms.uTime.value = time;
      uniforms.uSpread.value = spread;
      uniforms.uPointer.value.lerp(
        pointerTarget,
        immediate ? 1 : 1 - Math.exp(-delta * 5),
      );
    },
  };
}
