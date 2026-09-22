/** Cross-document curtain; ordinary anchors remain functional without JavaScript. */
export function initRouteTransitions() {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let navigationTimer: ReturnType<typeof setTimeout> | undefined;
  let entering = false;
  const reset = () => {
    clearTimeout(navigationTimer);
    delete root.dataset.routeTransition;
    entering = false;
  };
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) reset();
  });
  if (root.dataset.routeTransition === "enter")
    setTimeout(() => {
      // A fast second click must not have its pending navigation cancelled.
      if (!entering) delete root.dataset.routeTransition;
    }, 850);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && entering) {
      reset();
      try {
        sessionStorage.removeItem("dreamax-route");
      } catch {
        /* optional continuity */
      }
    }
  });
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      reduced.matches
    )
      return;
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self") ||
      link.dataset.noTransition !== undefined
    )
      return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol))
      return;
    if (url.pathname === location.pathname && url.search === location.search)
      return;
    // React Router owns navigation within the learning reader.
    if (
      location.pathname.startsWith("/fieldwork") &&
      url.pathname.startsWith("/fieldwork")
    )
      return;
    event.preventDefault();
    if (entering) return;
    entering = true;
    document
      .querySelectorAll<HTMLDialogElement>("dialog[open]")
      .forEach((dialog) => dialog.close());
    document.body.style.overflow = "";
    const label =
      url.pathname.startsWith("/llm-training") ||
      url.pathname.startsWith("/fieldwork")
        ? "LLM Training"
        : url.pathname.startsWith("/agentic-scholar")
          ? "Agentic Scholar"
          : url.pathname.startsWith("/algorithms")
            ? "Algorithm"
            : url.pathname.startsWith("/tools")
              ? "Tools"
              : url.pathname.startsWith("/join")
                ? "About DreaMax"
                : "DreaMax";
    const title = document.querySelector("[data-route-title]");
    if (title) title.textContent = link.dataset.transitionLabel || label;
    try {
      sessionStorage.setItem(
        "dreamax-route",
        JSON.stringify({ to: url.pathname, at: Date.now() }),
      );
    } catch {
      /* navigation does not require storage */
    }
    root.dataset.routeTransition = "exit";
    navigationTimer = setTimeout(() => location.assign(url.href), 280);
  });
}
