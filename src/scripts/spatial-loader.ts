/** Load Three.js only near a scene; importing the bundle is shared by all instances. */
export function observeSpatialScenes() {
  const hosts = [
    ...document.querySelectorAll<HTMLElement>(
      "[data-spatial-scene]:not([data-observed])",
    ),
  ];
  const load = async (host: HTMLElement) => {
    try {
      const { initSpatialScene } = await import("./spatial-scenes");
      initSpatialScene(host);
    } catch {
      host.dataset.render = "fallback";
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          void load(entry.target as HTMLElement);
        }
    },
    { rootMargin: "180px" },
  );
  hosts.forEach((host) => {
    host.dataset.observed = "true";
    observer.observe(host);
  });
}
