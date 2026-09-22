/** Restore the original slogan's word entrances, rainbow letters and spring bounce. */
export function initTerminalSlogan(host: HTMLElement) {
  const blocks = [...host.querySelectorAll<HTMLElement>(".ts-block")];
  const letters = [...host.querySelectorAll<HTMLElement>(".cl")];
  const button = host.querySelector<HTMLButtonElement>(".ts-world")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Map<HTMLElement, Animation>();
  let visible = true;
  let idle: ReturnType<typeof setInterval> | undefined;

  function animate(
    element: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    animations.get(element)?.cancel();
    const animation = element.animate(frames, options);
    animations.set(element, animation);
    animation.addEventListener(
      "finish",
      () => {
        if (
          options.fill !== "forwards" &&
          animations.get(element) === animation
        ) {
          animations.delete(element);
        }
      },
      { once: true },
    );
  }
  function stop() {
    clearInterval(idle);
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }
  function bounce(reveal = false) {
    if (reduced.matches || document.hidden || !visible) return;
    letters.forEach((letter, index) =>
      animate(
        letter,
        [
          {
            transform: reveal ? "translateX(-30px) scale(.3)" : "translateY(0)",
            opacity: reveal ? 0 : 1,
          },
          {
            transform: "translateY(-18px) scale(1.04)",
            opacity: 1,
            offset: 0.22,
          },
          { transform: "translateY(0)", offset: 0.4 },
          { transform: "translateY(-9px)", offset: 0.57 },
          { transform: "translateY(0)", offset: 0.72 },
          { transform: "translateY(-3px)", offset: 0.85 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        {
          duration: 950,
          delay: (reveal ? 750 : 0) + index * 40,
          easing: "ease-out",
          fill: "backwards",
        },
      ),
    );
  }
  function startIdle() {
    clearInterval(idle);
    if (reduced.matches || document.hidden || !visible) return;
    idle = setInterval(
      () =>
        blocks.forEach((block, index) =>
          animate(
            block,
            [
              { transform: "translateY(0)" },
              { transform: "translateY(-5px) scale(1.03)", offset: 0.42 },
              { transform: "translateY(0)" },
            ],
            { duration: 400, delay: index * 25, easing: "ease-out" },
          ),
        ),
      5000,
    );
  }
  function sync() {
    stop();
    startIdle();
  }
  if (!reduced.matches) {
    blocks.forEach((block, index) =>
      animate(
        block,
        [
          {
            opacity: 0,
            transform: "translateY(40px) rotate(-15deg) scale(.6)",
          },
          { opacity: 1, transform: "translateY(0) rotate(0) scale(1)" },
        ],
        {
          duration: 450,
          delay: 200 + index * 105,
          easing: "cubic-bezier(.34,1.56,.64,1)",
          fill: "backwards",
        },
      ),
    );
    bounce(true);
  }
  startIdle();
  button.addEventListener("click", () => {
    bounce();
    startIdle();
  });
  button.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch" || reduced.matches) return;
    letters.forEach((letter, index) =>
      animate(
        letter,
        [
          { transform: "translateY(0)" },
          {
            transform: `translate(${(index - (letters.length - 1) / 2) * 1.5}px,-4px) scale(1.04)`,
          },
        ],
        { duration: 250, fill: "forwards", easing: "ease-out" },
      ),
    );
  });
  button.addEventListener("pointerleave", () => bounce());
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  new IntersectionObserver(([entry]) => {
    const next = entry.isIntersecting;
    if (next !== visible) {
      visible = next;
      sync();
    }
  }).observe(host);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) startIdle();
  });
}
