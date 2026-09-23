import * as THREE from "three";

/** Refract the supplied photograph; retain the original picture as the fallback.
 * No video, external textures, continuous scroll listener or postprocessing pass. */
export async function initHeroOptics(hero: HTMLElement) {
  if (hero.dataset.opticsInitialized) return;
  hero.dataset.opticsInitialized = "true";
  const canvas = hero.querySelector<HTMLCanvasElement>(".hero-optical-canvas")!;
  const image = hero.querySelector<HTMLImageElement>(".hero-backdrop img")!;
  const button = hero.querySelector<HTMLButtonElement>("[data-hero-motion]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)");
  const abort = new AbortController(),
    options = { signal: abort.signal };
  let renderer: THREE.WebGLRenderer;
  try {
    await image.decode();
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch {
    hero.dataset.optics = "fallback";
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const uniforms = {
    uMap: { value: texture },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uCover: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uImpulse: { value: new THREE.Vector3(0.5, 0.5, -100) },
    uPresence: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: `varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uTime,uAspect,uPresence;
      uniform vec2 uCover,uPointer; uniform vec3 uImpulse; varying vec2 vUv;
      void main(){
        vec2 p=vUv, q=p-uPointer; q.x*=uAspect;
        float d=length(q);
        float fold=sin(p.x*5.5+p.y*3.2+uTime*.18)*.007
          +sin(p.y*6.-p.x*2.+uTime*.11)*.004;
        vec2 flow=vec2(1.,-.55)*fold;
        flow+=(p-uPointer)*exp(-d*3.8)*sin(d*11.-uTime*.65)*uPresence*.09;
        vec2 pulse=p-uImpulse.xy; pulse.x*=uAspect;
        float age=uTime-uImpulse.z, r=length(pulse);
        float wave=sin(r*26.-age*3.)*exp(-r*3.5-age*.9)*.013;
        flow+=normalize(p-uImpulse.xy+vec2(.0001))*wave;
        vec2 uv=(p+flow-.5)*uCover+.5;
        vec3 color=texture2D(uMap,clamp(uv,vec2(.002),vec2(.998))).rgb;
        color*=1.+fold*2.0;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
  });
  const scene = new THREE.Scene(),
    camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  let visible = true,
    paused = false,
    lost = false,
    frame = 0,
    last = 0,
    time = 0;
  let presence = 0;
  const target = new THREE.Vector2(0.5, 0.5);
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const allowed = () =>
    visible && !paused && !reduced.matches && !document.hidden && !lost;
  const schedule = () => {
    if (!frame && allowed()) frame = requestAnimationFrame(tick);
  };
  function tick(now: number) {
    frame = 0;
    if (!allowed()) return;
    if (now - last < 33) {
      schedule();
      return;
    }
    const delta = Math.min((now - last) / 1000, 0.06);
    last = now;
    time += delta;
    uniforms.uTime.value = time;
    uniforms.uPointer.value.lerp(target, 1 - Math.exp(-delta * 3.5));
    uniforms.uPresence.value +=
      (presence - uniforms.uPresence.value) * (1 - Math.exp(-delta * 3));
    renderer.render(scene, camera);
    schedule();
  }
  const sync = () => {
    button.hidden = reduced.matches || lost;
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute("aria-label", paused ? "播放背景动效" : "暂停背景动效");
    button.querySelector("span")!.textContent = paused ? "▷" : "Ⅱ";
    hero.dataset.optics = lost
      ? "fallback"
      : reduced.matches
        ? "static"
        : "ready";
    hero.dataset.opticsPaused = String(paused || reduced.matches);
    stop();
    last = performance.now();
    schedule();
  };
  const size = () => {
    const width = hero.clientWidth,
      height = hero.clientHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height,
      imageAspect = image.naturalWidth / image.naturalHeight;
    uniforms.uAspect.value = aspect;
    uniforms.uCover.value.set(
      Math.min(1, aspect / imageAspect),
      Math.min(1, imageAspect / aspect),
    );
    if (!lost) renderer.render(scene, camera);
  };
  const resize = new ResizeObserver(size);
  resize.observe(hero);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    hero.dataset.opticsVisible = String(visible);
    if (!visible) stop();
    else {
      last = performance.now();
      schedule();
    }
  });
  observer.observe(hero);
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!fine.matches || reduced.matches) return;
      const r = hero.getBoundingClientRect();
      target.set(
        (event.clientX - r.left) / r.width,
        1 - (event.clientY - r.top) / r.height,
      );
      presence = 1;
    },
    options,
  );
  hero.addEventListener(
    "pointerleave",
    () => {
      presence = 0;
    },
    options,
  );
  hero.addEventListener(
    "pointerdown",
    (event) => {
      if (
        reduced.matches ||
        paused ||
        (event.target as Element).closest("a,button")
      )
        return;
      const r = hero.getBoundingClientRect();
      uniforms.uImpulse.value.set(
        (event.clientX - r.left) / r.width,
        1 - (event.clientY - r.top) / r.height,
        time,
      );
    },
    options,
  );
  button.addEventListener(
    "click",
    () => {
      paused = !paused;
      sync();
    },
    options,
  );
  reduced.addEventListener("change", sync, options);
  document.addEventListener(
    "visibilitychange",
    () => {
      stop();
      last = performance.now();
      schedule();
    },
    options,
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      lost = true;
      sync();
    },
    options,
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      lost = false;
      size();
      sync();
    },
    options,
  );
  window.addEventListener(
    "pagehide",
    (event) => {
      stop();
      if (event.persisted) return;
      abort.abort();
      observer.disconnect();
      resize.disconnect();
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
    options,
  );
  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) sync();
    },
    options,
  );
  size();
  sync();
}
