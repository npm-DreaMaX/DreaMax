/** Disclosure navigation keeps normal links and supports keyboard input. */
export function initCommandNavigation() {
  const header = document.querySelector<HTMLElement>("[data-command-header]");
  const toggle = header?.querySelector<HTMLButtonElement>(
    "[data-training-toggle]",
  );
  const panel = header?.querySelector<HTMLElement>("#dm-training-menu");
  if (!header || !toggle || !panel) return;
  const setOpen = (open: boolean) => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  toggle.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      panel.querySelector<HTMLAnchorElement>("a")?.focus();
    }
  });
  header.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!header.contains(event.target as Node)) setOpen(false);
  });
  header.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !header.contains(event.relatedTarget as Node))
      setOpen(false);
  });
  header
    .querySelectorAll("[data-open-menu], [data-open-search]")
    .forEach((button) => {
      button.addEventListener("click", () => setOpen(false));
    });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
      setOpen(false);
  });
  matchMedia("(min-width: 1041px)").addEventListener("change", () =>
    setOpen(false),
  );
  const updateScroll = () => {
    header.dataset.scrolled = String(scrollY > 24);
  };
  updateScroll();
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("pageshow", () => setOpen(false));
}
