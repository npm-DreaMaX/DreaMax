export function initExpeditionHero() {
  const hero = document.querySelector<HTMLElement>(".expedition-hero");
  if (!hero) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");
  let frame = 0;
  const update = () => {
    frame = 0;
    const progress = Math.min(1, Math.max(0, scrollY / hero.offsetHeight));
    hero.style.setProperty(
      "--hero-scroll",
      reduced.matches ? "0" : String(progress),
    );
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  reduced.addEventListener("change", () => {
    hero.style.setProperty("--pointer-x", "0px");
    hero.style.setProperty("--pointer-y", "0px");
    queue();
  });
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (reduced.matches || !finePointer.matches) return;
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty(
        "--pointer-x",
        `${(event.clientX / rect.width - 0.5) * 14}px`,
      );
      hero.style.setProperty(
        "--pointer-y",
        `${((event.clientY - rect.top) / rect.height - 0.5) * 10}px`,
      );
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--pointer-x", "0px");
    hero.style.setProperty("--pointer-y", "0px");
  });
  update();
}
