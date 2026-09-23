/** Each click executes one real adjacent comparison in bubble sort. */
export function initSortingScenes() {
  document
    .querySelectorAll<HTMLElement>("[data-sorting-scene]")
    .forEach((host) => {
      const initial = [6, 2, 8, 4, 1, 7, 3, 9, 5];
      let values = [...initial],
        cursor = 0,
        end = values.length - 1,
        comparisons = 0;
      let timer: ReturnType<typeof setInterval> | undefined;
      const reduced = matchMedia("(prefers-reduced-motion:reduce)");
      const bars = [...host.querySelectorAll<HTMLElement>("[data-sort-value]")];
      const play = host.querySelector<HTMLButtonElement>("[data-sort-play]")!;
      const step = host.querySelector<HTMLButtonElement>("[data-sort-step]")!;
      const reset = host.querySelector<HTMLButtonElement>("[data-sort-reset]")!;
      const status = host.querySelector<HTMLElement>("[data-sort-status]")!;
      const readout = host.querySelector<HTMLElement>("[data-sort-readout]")!;
      host
        .querySelectorAll<HTMLButtonElement>("button")
        .forEach((b) => (b.disabled = false));
      function stop() {
        clearInterval(timer);
        timer = undefined;
        play.textContent = "自动播放 ↗";
        play.setAttribute("aria-pressed", "false");
      }
      function draw(active: number[] = []) {
        bars.forEach((bar) => {
          const value = Number(bar.dataset.sortValue);
          bar.style.setProperty("--bar-index", String(values.indexOf(value)));
          bar.dataset.active = String(active.includes(value));
        });
        readout.textContent = values.join(" · ");
        host.dataset.sortValues = values.join(",");
        host.dataset.comparisons = String(comparisons);
      }
      function next() {
        if (end === 0) return;
        const a = values[cursor],
          b = values[cursor + 1];
        if (a > b) [values[cursor], values[cursor + 1]] = [b, a];
        comparisons++;
        cursor++;
        if (cursor >= end) {
          cursor = 0;
          end--;
        }
        status.textContent =
          end === 0 ? "排序完成" : `第 ${comparisons} 次比较：${a} / ${b}`;
        draw(end === 0 ? [] : [a, b]);
        if (end === 0) {
          stop();
          step.disabled = true;
          play.disabled = true;
        }
      }
      step.addEventListener("click", () => {
        stop();
        next();
      });
      play.addEventListener("click", () => {
        if (timer) {
          stop();
          return;
        }
        if (reduced.matches) {
          next();
          return;
        }
        play.textContent = "暂停 Ⅱ";
        play.setAttribute("aria-pressed", "true");
        next();
        if (end > 0) timer = setInterval(next, 450);
      });
      reset.addEventListener("click", () => {
        stop();
        values = [...initial];
        cursor = 0;
        end = values.length - 1;
        comparisons = 0;
        step.disabled = false;
        play.disabled = false;
        status.textContent = "比较相邻元素";
        draw();
      });
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) stop();
      }).observe(host);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
      });
      reduced.addEventListener("change", () => {
        if (reduced.matches) stop();
      });
      window.addEventListener("pagehide", stop);
      draw();
    });
}
