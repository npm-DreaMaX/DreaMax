/** Pointer effects keep link hit areas stationary; all controls work by keyboard. */
export function initStudioInteractions() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)");
  document
    .querySelectorAll<HTMLElement>(
      ".stage-button,.hero-primary,.hero-secondary,.project-source-link,.closing-mail",
    )
    .forEach((link) => {
      link.dataset.magnetic = "true";
      const reset = () => {
        link.style.removeProperty("--magnetic-x");
        link.style.removeProperty("--magnetic-y");
      };
      link.addEventListener(
        "pointermove",
        (event) => {
          if (reduced.matches || !fine.matches) return;
          const r = link.getBoundingClientRect();
          link.style.setProperty(
            "--magnetic-x",
            `${((event.clientX - r.left) / r.width - 0.5) * 14}px`,
          );
          link.style.setProperty(
            "--magnetic-y",
            `${((event.clientY - r.top) / r.height - 0.5) * 10}px`,
          );
        },
        { passive: true },
      );
      link.addEventListener("pointerleave", reset);
      reduced.addEventListener("change", reset);
    });
  const foil = document.querySelector<HTMLElement>(".closing-wordmark");
  foil?.addEventListener(
    "pointermove",
    (event) => {
      if (reduced.matches || !fine.matches) return;
      const r = foil.getBoundingClientRect();
      foil.style.setProperty(
        "--foil-x",
        `${((event.clientX - r.left) / r.width) * 100}%`,
      );
      foil.dataset.foil = "true";
    },
    { passive: true },
  );
  const resetFoil = () => {
    if (foil) foil.dataset.foil = "false";
  };
  foil?.addEventListener("pointerleave", resetFoil);
  reduced.addEventListener("change", resetFoil);
  const comparison = document.querySelector<HTMLElement>(".piece-beautifier");
  const slider =
    comparison?.querySelector<HTMLInputElement>("[data-comparison]");
  if (comparison && slider) {
    const output = comparison.querySelector("output")!;
    const set = (value: number) => {
      const percent = Math.max(2, Math.min(98, Math.round(value)));
      comparison.style.setProperty("--comparison", `${percent}%`);
      slider.value = String(percent);
      output.textContent = `${percent}%`;
    };
    slider.addEventListener("input", () => set(Number(slider.value)));
    comparison.querySelector<HTMLElement>(".piece-art")!.addEventListener(
      "pointermove",
      (event) => {
        if (reduced.matches || !fine.matches) return;
        const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
        set(((event.clientX - r.left) / r.width) * 100);
      },
      { passive: true },
    );
  }
}
