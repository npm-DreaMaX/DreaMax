/** All scenes are static HTML first; motion and exploration progressively enhance it. */
export function initHomeStages() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const bindTabs = (
    selector: string,
    panelPrefix: string,
    onSelect?: (i: number) => void,
  ) => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLButtonElement>(selector),
    );
    const select = (index: number) => {
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        const panel = document.getElementById(`${panelPrefix}${i}`);
        if (panel) panel.hidden = i !== index;
      });
      onSelect?.(index);
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(i));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                tabs.length;
        select(next);
        tabs[next].focus();
      });
    });
  };
  bindTabs("[data-phase-tab]", "phase-panel-", (index) => {
    const field = document.querySelector<HTMLElement>("[data-training-field]");
    const tab = document.querySelector<HTMLElement>(
      `[data-phase-tab="${index}"]`,
    );
    field?.style.setProperty(
      "--field-color",
      tab?.dataset.fieldColor || "#ff8b54",
    );
    field?.style.setProperty("--field-angle", `${index * 24}deg`);
  });
  bindTabs("[data-project-tab]", "project-panel-");

  const trajectory = [
    { title: "接收任务", text: "修复一个失败的单元测试。" },
    { title: "执行动作", text: "读取源码，运行测试，定位错误。" },
    { title: "观察反馈", text: "读取报错信息，修改实现，再次测试。" },
    { title: "验证结果", text: "通过测试与独立检查，结束这一轮任务。" },
  ];
  const stepButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-agent-step]"),
  );
  let current = 0;
  const setStep = (step: number) => {
    current = step;
    stepButtons.forEach((button, i) =>
      button.setAttribute("aria-pressed", String(i === step)),
    );
    document
      .querySelectorAll("[data-trajectory-node]")
      .forEach((node, i) => node.classList.toggle("is-active", i === step));
    const title = document.querySelector("[data-agent-title]");
    const detail = document.querySelector("[data-agent-detail]");
    const number = document.querySelector("[data-agent-number]");
    if (title) title.textContent = trajectory[step].title;
    if (detail) detail.textContent = trajectory[step].text;
    if (number) number.textContent = `0${step + 1}`;
  };
  stepButtons.forEach((button, i) =>
    button.addEventListener("click", () => setStep(i)),
  );
  document
    .querySelector("[data-agent-next]")
    ?.addEventListener("click", () =>
      setStep((current + 1) % trajectory.length),
    );

  // Only animate visible scenes. No scroll pinning, forced snapping or wheel handlers.
  const stages = Array.from(
    document.querySelectorAll<HTMLElement>("[data-home-stage]"),
  );
  const visible = new Set<HTMLElement>();
  let frame = 0;
  const render = () => {
    frame = 0;
    visible.forEach((stage) => {
      const rect = stage.getBoundingClientRect();
      const progress = Math.max(
        -1,
        Math.min(
          1,
          (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight,
        ),
      );
      stage.style.setProperty(
        "--stage-progress",
        reduced.matches ? "0" : String(progress),
      );
    });
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const stage = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            visible.add(stage);
            queue();
          } else visible.delete(stage);
        }),
      { rootMargin: "150px" },
    );
    stages.forEach((stage) => observer.observe(stage));
  }
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue, { passive: true });
  reduced.addEventListener("change", () => {
    stages.forEach((stage) => stage.style.setProperty("--stage-progress", "0"));
    queue();
  });
}
