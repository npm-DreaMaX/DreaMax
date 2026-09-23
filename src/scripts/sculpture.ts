import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Original parametric sculpture. No textures, downloaded images or video. */
export function initSculpture(host: HTMLElement) {
  const canvas = host.querySelector("canvas")!;
  const stage = host.querySelector<HTMLElement>(".dm-sculpture-stage")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fallback = () => {
    host.dataset.render = "fallback";
    host.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.disabled = true;
    });
    stage.tabIndex = -1;
    stage.setAttribute("aria-label", "银色几何雕塑的静态线稿");
  };
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    fallback();
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x111210, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0, 8.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.055);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const group = new THREE.Group();
  scene.add(group);
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd1d1d1, 3);
  rim.position.set(-4, -2, 3);
  scene.add(rim);
  const warm = new THREE.DirectionalLight(0xff712e, 2);
  warm.position.set(2, -4, -3);
  scene.add(warm);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xbdbdbd,
    metalness: 0.92,
    roughness: 0.25,
    side: THREE.DoubleSide,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xf3f3f3,
    transparent: true,
    opacity: 0.35,
  });
  const n = 300,
    m = 56;
  const pos = new Float32Array((n + 1) * (m + 1) * 3);
  const index: number[] = [];
  function point(u: number, v: number, shape: number) {
    if (shape === 1) {
      const a = u * 2 * Math.PI;
      const r = 1.6 + v * 0.55;
      return [
        r * Math.cos(a),
        r * Math.sin(a),
        Math.sin(a * 3) * 0.42 + Math.sin(v * 3) * 0.4,
      ];
    }
    const a = u * 2 * Math.PI;
    const turns = shape === 2 ? 2.5 : 1.5;
    const r = 1.64 + 0.24 * Math.cos(a * 3);
    const width = v * (shape === 2 ? 0.48 : 0.7);
    const pleat = 0.018 * Math.cos(v * Math.PI * 22);
    return [
      (r + width * Math.cos(turns * a)) * Math.cos(a),
      (r + width * Math.cos(turns * a)) * Math.sin(a),
      width * Math.sin(turns * a) + 0.27 * Math.sin(3 * a) + pleat,
    ];
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const a = i * (m + 1) + j,
        b = (i + 1) * (m + 1) + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  const contours = new THREE.Group();
  group.add(contours);
  for (let k = 0; k < 15; k++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3),
    );
    contours.add(new THREE.Line(g, edgeMaterial));
  }
  let shape = 0,
    from = 0,
    morph = 1,
    paused = reduced.matches,
    visible = true,
    dragging = false;
  let rx = 0.72,
    ry = -0.22,
    targetX = 0.72,
    targetY = -0.22,
    previousX = 0,
    previousY = 0,
    frame = 0,
    last = 0;
  const pauseButton = host.querySelector<HTMLButtonElement>(
    "[data-sculpture-pause]",
  )!;
  function syncPause() {
    pauseButton.setAttribute("aria-pressed", String(paused));
    pauseButton.setAttribute(
      "aria-label",
      paused ? "播放雕塑动画" : "暂停雕塑动画",
    );
    pauseButton.querySelector("[data-pause-icon]")!.textContent = paused
      ? "▷"
      : "Ⅱ";
  }
  function updateGeometry() {
    const blend = morph * morph * (3 - 2 * morph);
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= m; j++) {
        const a = point(i / n, (j / m) * 2 - 1, from),
          b = point(i / n, (j / m) * 2 - 1, shape),
          off = (i * (m + 1) + j) * 3;
        for (let q = 0; q < 3; q++) pos[off + q] = a[q] + (b[q] - a[q]) * blend;
      }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    contours.children.forEach((child, k) => {
      const g = (child as THREE.Line).geometry;
      const p = g.attributes.position.array as Float32Array;
      for (let i = 0; i <= n; i++) {
        const a = point(i / n, (k / 14) * 2 - 1, from),
          b = point(i / n, (k / 14) * 2 - 1, shape);
        for (let q = 0; q < 3; q++) p[i * 3 + q] = a[q] + (b[q] - a[q]) * blend;
      }
      g.attributes.position.needsUpdate = true;
    });
  }
  updateGeometry();
  const size = () => {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  function draw() {
    group.rotation.set(rx, ry, -0.3);
    renderer.render(scene, camera);
  }
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (!visible || document.hidden || now - last < 32) return;
    const dt = Math.min((now - last) / 1000, 0.08);
    last = now;
    if (!paused && !dragging) targetY += dt * 0.085;
    if (morph < 1) {
      morph = Math.min(1, morph + dt * 1.5);
      updateGeometry();
    }
    rx += (targetX - rx) * 0.1;
    ry += (targetY - ry) * 0.1;
    if (
      !paused ||
      dragging ||
      morph < 1 ||
      Math.abs(rx - targetX) + Math.abs(ry - targetY) > 0.0001
    )
      draw();
  }
  host.querySelectorAll<HTMLButtonElement>("[data-shape]").forEach((button) =>
    button.addEventListener("click", () => {
      from = shape;
      shape = Number(button.dataset.shape);
      morph = reduced.matches ? 1 : 0;
      host
        .querySelectorAll("[data-shape]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      if (reduced.matches) {
        updateGeometry();
        draw();
      }
    }),
  );
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    syncPause();
  });
  host
    .querySelector("[data-sculpture-reset]")!
    .addEventListener("click", () => {
      targetX = 0.72;
      targetY = -0.22;
      if (reduced.matches) {
        rx = targetX;
        ry = targetY;
        draw();
      }
    });
  stage.addEventListener("pointerdown", (e) => {
    dragging = true;
    previousX = e.clientX;
    previousY = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    targetY += (e.clientX - previousX) * 0.009;
    targetX += (e.clientY - previousY) * 0.009;
    previousX = e.clientX;
    previousY = e.clientY;
  });
  stage.addEventListener("pointerup", () => (dragging = false));
  stage.addEventListener("pointercancel", () => (dragging = false));
  stage.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    targetY += e.key === "ArrowLeft" ? -0.2 : e.key === "ArrowRight" ? 0.2 : 0;
    targetX += e.key === "ArrowUp" ? -0.2 : e.key === "ArrowDown" ? 0.2 : 0;
  });
  stage.addEventListener("focus", () => {
    paused = true;
    syncPause();
  });
  reduced.addEventListener("change", () => {
    paused = reduced.matches;
    syncPause();
  });
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  });
  observer.observe(host);
  const resize = new ResizeObserver(size);
  resize.observe(stage);
  syncPause();
  size();
  host.dataset.render = "webgl";
  frame = requestAnimationFrame(tick);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(frame);
    fallback();
  });
  window.addEventListener(
    "pagehide",
    (e) => {
      if (e.persisted) return;
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      edgeMaterial.dispose();
      contours.children.forEach((o) => (o as THREE.Line).geometry.dispose());
      environment.dispose();
      renderer.dispose();
    },
    { once: true },
  );
}
