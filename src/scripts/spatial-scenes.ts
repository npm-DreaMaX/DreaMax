import * as THREE from "three";
import { createStudioEnvironment } from "./studio-environment";
import { createSpatialModel } from "./spatial-models";

export function initSpatialScene(host: HTMLElement) {
  if (host.dataset.initialized) return;
  host.dataset.initialized = "true";
  const frameEl = host.querySelector<HTMLElement>(".spatial-canvas-frame")!;
  const canvas = host.querySelector("canvas")!;
  const buttons = [
    ...host.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      "button,input",
    ),
  ];
  const pause = host.querySelector<HTMLButtonElement>("[data-spatial-pause]")!;
  const expand = host.querySelector<HTMLButtonElement>(
    "[data-spatial-expand]",
  )!;
  const reset = host.querySelector<HTMLButtonElement>("[data-spatial-reset]")!;
  const originalLabel = frameEl.getAttribute("aria-label")!;
  const hint = host.querySelector<HTMLElement>(".spatial-hint")!;
  const originalHint = hint.innerHTML;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let renderer: THREE.WebGLRenderer;
  let lost = false;
  const fallback = () => {
    host.dataset.render = "fallback";
    buttons.forEach((b) => (b.disabled = true));
    frameEl.tabIndex = -1;
    host.querySelector(".spatial-hint")!.textContent = "静态示意";
    frameEl.setAttribute("aria-label", "三维图形的静态线稿");
  };
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    fallback();
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x111111, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
  camera.position.set(0, 0.15, 8.5);
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.15;
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  for (const [x, y, z, power] of [
    [3, 4, 5, 1.6],
    [-4, -1, 2, 0.45],
  ]) {
    const light = new THREE.DirectionalLight(0xffffff, power);
    light.position.set(x, y, z);
    scene.add(light);
  }
  const model = createSpatialModel(
    host.dataset.spatialScene!,
    host.dataset.spatialTheme === "orange",
  );
  scene.add(model.root);
  const settings = host.querySelector<HTMLButtonElement>(
    "[data-spatial-settings]",
  )!;
  const panel = host.querySelector<HTMLElement>(
    "[data-spatial-settings-panel]",
  )!;
  const lightInput = host.querySelector<HTMLInputElement>(
    "[data-spatial-light]",
  )!;
  const speedInput = host.querySelector<HTMLInputElement>(
    "[data-spatial-speed]",
  )!;
  let speed = 1;
  const finishes = [
    ...host.querySelectorAll<HTMLButtonElement>("[data-spatial-finish]"),
  ];
  const baseMaterials = new Map<
    THREE.MeshStandardMaterial,
    { metalness: number; roughness: number }
  >();
  model.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const m of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (m instanceof THREE.MeshStandardMaterial && !baseMaterials.has(m))
        baseMaterials.set(m, {
          metalness: m.metalness,
          roughness: m.roughness,
        });
    }
  });
  settings.addEventListener(
    "click",
    () => {
      panel.hidden = !panel.hidden;
      settings.setAttribute("aria-expanded", String(!panel.hidden));
    },
    options,
  );
  finishes.forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        const matte = button.dataset.spatialFinish === "matte";
        baseMaterials.forEach((base, m) => {
          m.metalness = matte ? 0.04 : base.metalness;
          m.roughness = matte ? 0.58 : base.roughness;
        });
        finishes.forEach((b) =>
          b.setAttribute("aria-pressed", String(b === button)),
        );
        host.dataset.finish = button.dataset.spatialFinish;
        draw(true);
      },
      options,
    ),
  );
  lightInput.addEventListener(
    "input",
    () => {
      scene.environmentRotation.y = (Number(lightInput.value) * Math.PI) / 180;
      host.querySelector("[data-spatial-light-value]")!.textContent =
        `${lightInput.value}°`;
      draw(true);
    },
    options,
  );
  speedInput.addEventListener(
    "input",
    () => {
      speed = Number(speedInput.value) / 100;
      host.querySelector("[data-spatial-speed-value]")!.textContent =
        `${speed.toFixed(1)}×`;
    },
    options,
  );
  let state = Number(host.dataset.state || 0),
    visible = false,
    paused = reduced.matches;
  let targetX = 0.45,
    targetY = -0.35,
    rotationX = targetX,
    rotationY = targetY;
  let expanded = false,
    spread = 0,
    time = 0,
    last = 0,
    raf = 0,
    dragging = false,
    moved = 0;
  let px = 0,
    py = 0;
  const raycaster = new THREE.Raycaster();
  model.state(state);
  function syncPause() {
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute(
      "aria-label",
      pause
        .getAttribute("aria-label")!
        .replace(/暂停|播放/, paused ? "播放" : "暂停"),
    );
    pause.querySelector("[data-spatial-pause-icon]")!.textContent = paused
      ? "▷"
      : "Ⅱ";
    host.dataset.paused = String(paused);
  }
  function draw(immediate = false, delta = 0) {
    if (lost) return;
    if (immediate) {
      rotationX = targetX;
      rotationY = targetY;
      spread = expanded ? 1 : 0;
    }
    model.root.rotation.set(rotationX, rotationY, -0.12);
    model.update(time, delta, spread, immediate);
    renderer.render(scene, camera);
  }
  function schedule() {
    if (!raf && visible && !document.hidden && !paused && !lost)
      raf = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    raf = 0;
    if (!visible || document.hidden || paused || lost) return;
    if (now - last < 33) {
      schedule();
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    time += dt * speed;
    if (!dragging) targetY += dt * speed * 0.095;
    const blend = 1 - Math.exp(-dt * 8);
    rotationX += (targetX - rotationX) * blend;
    rotationY += (targetY - rotationY) * blend;
    spread += ((expanded ? 1 : 0) - spread) * blend;
    draw(false, dt);
    schedule();
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function select(index: number) {
    host.dataset.state = String((index + model.states) % model.states);
    host.dispatchEvent(
      new CustomEvent("spatial-select", {
        bubbles: true,
        detail: Number(host.dataset.state),
      }),
    );
  }
  const attributes = new MutationObserver(() => {
    state = Number(host.dataset.state || 0);
    model.state(state);
    draw(paused || reduced.matches, 0.035);
    schedule();
  });
  attributes.observe(host, {
    attributes: true,
    attributeFilter: ["data-state"],
  });
  pause.addEventListener(
    "click",
    () => {
      paused = !paused;
      syncPause();
      stop();
      if (!paused) schedule();
    },
    options,
  );
  expand.addEventListener(
    "click",
    () => {
      expanded = !expanded;
      host.dataset.expanded = String(expanded);
      expand.setAttribute("aria-pressed", String(expanded));
      expand.innerHTML = expanded
        ? '收拢 <span aria-hidden="true">↙</span>'
        : '展开 <span aria-hidden="true">↗</span>';
      expand.setAttribute(
        "aria-label",
        expand
          .getAttribute("aria-label")!
          .replace(/展开|收拢/, expanded ? "收拢" : "展开"),
      );
      draw(paused || reduced.matches, 0.035);
      schedule();
    },
    options,
  );
  reset.addEventListener(
    "click",
    () => {
      targetX = 0.45;
      targetY = -0.35;
      draw(true);
    },
    options,
  );
  frameEl.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      dragging = true;
      moved = 0;
      px = event.clientX;
      py = event.clientY;
      frameEl.setPointerCapture(event.pointerId);
    },
    options,
  );
  frameEl.addEventListener(
    "pointermove",
    (event) => {
      if (!dragging) return;
      const dx = event.clientX - px,
        dy = event.clientY - py;
      moved += Math.abs(dx) + Math.abs(dy);
      targetY += dx * 0.008;
      targetX = Math.max(-1.2, Math.min(1.2, targetX + dy * 0.006));
      px = event.clientX;
      py = event.clientY;
      // Direct manipulation remains available when automatic motion is disabled.
      draw(true);
    },
    options,
  );
  frameEl.addEventListener(
    "pointerup",
    (event) => {
      dragging = false;
      if (frameEl.hasPointerCapture(event.pointerId))
        frameEl.releasePointerCapture(event.pointerId);
      if (moved < 8 && model.targets.length) {
        const r = frameEl.getBoundingClientRect();
        raycaster.setFromCamera(
          new THREE.Vector2(
            ((event.clientX - r.left) / r.width) * 2 - 1,
            1 - ((event.clientY - r.top) / r.height) * 2,
          ),
          camera,
        );
        const hit = raycaster.intersectObjects(model.targets)[0];
        if (hit) select(Number(hit.object.userData.state));
      }
    },
    options,
  );
  frameEl.addEventListener(
    "pointercancel",
    () => {
      dragging = false;
    },
    options,
  );
  frameEl.addEventListener(
    "keydown",
    (event) => {
      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        select(Number(event.key) - 1);
        return;
      }
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      targetY +=
        event.key === "ArrowLeft" ? -0.2 : event.key === "ArrowRight" ? 0.2 : 0;
      targetX +=
        event.key === "ArrowUp" ? -0.2 : event.key === "ArrowDown" ? 0.2 : 0;
      draw(true);
    },
    options,
  );
  const size = () => {
    const { width, height } = frameEl.getBoundingClientRect();
    if (!width || !height || lost) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw(true);
  };
  const resize = new ResizeObserver(size);
  resize.observe(frameEl);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    host.dataset.visible = String(visible);
    if (visible) {
      last = performance.now();
      draw(true);
      schedule();
    } else stop();
  });
  observer.observe(host);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
      else {
        last = performance.now();
        schedule();
      }
    },
    options,
  );
  reduced.addEventListener(
    "change",
    () => {
      paused = reduced.matches;
      stop();
      syncPause();
      draw(true);
      schedule();
    },
    options,
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      lost = true;
      stop();
      fallback();
    },
    options,
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      lost = false;
      host.dataset.render = "webgl";
      frameEl.tabIndex = 0;
      frameEl.setAttribute("aria-label", originalLabel);
      hint.innerHTML = originalHint;
      buttons.forEach((b) => (b.disabled = false));
      size();
      schedule();
    },
    options,
  );
  window.addEventListener(
    "pagehide",
    (event) => {
      stop();
      if (event.persisted) return;
      abort.abort();
      resize.disconnect();
      observer.disconnect();
      attributes.disconnect();
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          geometries.add(obj.geometry);
          const m = obj.material;
          (Array.isArray(m) ? m : [m]).forEach((item) => materials.add(item));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      environment.dispose();
      renderer.dispose();
    },
    options,
  );
  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) {
        last = performance.now();
        schedule();
      }
    },
    options,
  );
  buttons.forEach((b) => (b.disabled = false));
  syncPause();
  size();
  host.dataset.render = "webgl";
}
