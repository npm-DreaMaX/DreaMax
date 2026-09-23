export function initDepthEffects() {
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const pointer = matchMedia("(pointer:fine)");
  const elements = [
    ...document.querySelectorAll<HTMLElement>(
      ".playground-piece .piece-art,.collection-tool-art,.about-portrait",
    ),
  ];
  for (const element of elements) {
    element.dataset.depth = "true";
    let frame = 0,
      x = 0,
      y = 0;
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      element.style.setProperty("--depth-x", "0deg");
      element.style.setProperty("--depth-y", "0deg");
    };
    element.addEventListener(
      "pointermove",
      (event) => {
        if (reduced.matches || !pointer.matches) return;
        const box = (element.parentElement || element).getBoundingClientRect();
        x = Math.max(
          -1,
          Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1),
        );
        y = Math.max(
          -1,
          Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1),
        );
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0;
            element.style.setProperty("--depth-y", `${x * 8}deg`);
            element.style.setProperty("--depth-x", `${-y * 7}deg`);
          });
      },
      { passive: true },
    );
    element.addEventListener("pointerleave", clear);
    reduced.addEventListener("change", clear);
  }
  let raf = 0;
  const update = () => {
    raf = 0;
    const total = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty(
      "--reading-progress",
      String(total > 0 ? Math.max(0, Math.min(1, scrollY / total)) : 0),
    );
  };
  const queue = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue, { passive: true });
  update();
}
