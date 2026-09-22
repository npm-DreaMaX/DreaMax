/** Original click-to-drop HTML strings, with bounded particles and automatic cleanup. */
export function initClickEffects(layer: HTMLElement) {
  const tags = [
    "<div>",
    "</div>",
    "<p>",
    "</p>",
    "<span>",
    "</span>",
    "<h1>",
    "<h2>",
    "<h3>",
    "<a>",
    "<code>",
    "</html>",
    "<header>",
    "<section>",
    "<body>",
  ];
  const colors = [
    "#e9689e",
    "#66d9ed",
    "#c586c0",
    "#ce9178",
    "#78b7e8",
    "#ff9060",
    "#a7c891",
  ];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Set<Animation>();
  const clear = () => {
    active.forEach((animation) => animation.cancel());
    active.clear();
    layer.replaceChildren();
  };
  function play(
    element: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    layer.append(element);
    const animation = element.animate(frames, options);
    active.add(animation);
    const remove = () => {
      element.remove();
      active.delete(animation);
    };
    animation.addEventListener("finish", remove, { once: true });
    animation.addEventListener("cancel", remove, { once: true });
  }
  document.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.detail === 0 ||
      reduced.matches ||
      document.hidden
    )
      return;
    if (
      (event.target as Element).closest(
        'input,textarea,select,[contenteditable="true"]',
      )
    )
      return;
    // Fast repeated clicks cannot leave an unbounded DOM or animation queue.
    if (active.size > 32) clear();
    const ripple = document.createElement("span");
    ripple.className = "click-code-ripple";
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    play(
      ripple,
      [
        { transform: "scale(.02)", opacity: 0.65 },
        { transform: "scale(1.6)", opacity: 0 },
      ],
      { duration: 750, easing: "ease-out" },
    );
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const particle = document.createElement("span");
      particle.className = "click-code-particle";
      particle.textContent = tags[Math.floor(Math.random() * tags.length)];
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
      const dx = (Math.random() - 0.5) * 100;
      const dy = 70 + Math.random() * 110;
      const angle = (Math.random() - 0.5) * 24;
      play(
        particle,
        [
          { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 0.95 },
          {
            transform: `translate(calc(-50% + ${dx * 0.3}px),12px) rotate(${angle * 0.35}deg)`,
            opacity: 0.9,
            offset: 0.25,
          },
          {
            transform: `translate(calc(-50% + ${dx}px),${dy}px) rotate(${angle}deg)`,
            opacity: 0,
          },
        ],
        { duration: 1800, easing: "cubic-bezier(.3,0,.7,1)" },
      );
    }
  });
  reduced.addEventListener("change", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  window.addEventListener("pagehide", clear);
}
