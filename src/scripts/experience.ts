import { initCommandNavigation } from "./navigation";
interface SearchItem {
  title: string;
  description: string;
  category: string;
  href: string;
  keywords: string;
}
export function initExperience() {
  initCommandNavigation();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // Observe only after initialization, leaving the entire page readable without JS.
  if (!reduced.matches && "IntersectionObserver" in window) {
    document.documentElement.classList.add("dm-motion");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.06 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
  }
  const menu = document.querySelector<HTMLDialogElement>("#dm-menu");
  const search = document.querySelector<HTMLDialogElement>("#dm-search");
  const input = document.querySelector<HTMLInputElement>("#dm-search-input");
  const list = document.querySelector<HTMLElement>("#dm-search-results");
  const dataEl = document.querySelector("#dm-search-data");
  const items: SearchItem[] = JSON.parse(dataEl?.textContent || "[]");
  let opener: HTMLElement | null = null;
  function show(dialog: HTMLDialogElement | null, source?: HTMLElement) {
    if (!dialog) return;
    opener = source || (document.activeElement as HTMLElement);
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }
  function close(dialog: HTMLDialogElement) {
    dialog.close();
  }
  [menu, search].forEach((dialog) => {
    if (!dialog) return;
    dialog
      .querySelectorAll<HTMLButtonElement>("[data-close-dialog]")
      .forEach((b) => b.addEventListener("click", () => close(dialog)));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          close(dialog);
      }
    });
    dialog.addEventListener("close", () => {
      document.body.style.overflow = "";
      opener?.focus();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    });
  });
  function renderResults() {
    if (!input || !list) return;
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const found = words.length
      ? items.filter((item) =>
          words.every((w) =>
            `${item.title} ${item.description} ${item.keywords} ${item.category}`
              .toLowerCase()
              .includes(w),
          ),
        )
      : items
          .filter((i) =>
            ["MiMo-V2.6", "DeepSeek-V4.1", "Kimi K3", "Qwen3.8", "Gomoku"].some(
              (t) => i.title.includes(t),
            ),
          )
          .slice(0, 6);
    list.replaceChildren();
    for (const item of found) {
      const link = document.createElement("a");
      link.href = item.href;
      const category = document.createElement("span");
      category.textContent = item.category;
      const title = document.createElement("strong");
      title.textContent = item.title;
      const description = document.createElement("small");
      description.textContent = item.description;
      const arrow = document.createElement("i");
      arrow.textContent = "↗";
      arrow.setAttribute("aria-hidden", "true");
      link.append(category, title, description, arrow);
      list.append(link);
    }
    if (!found.length) {
      const empty = document.createElement("p");
      empty.textContent = "还没找到。试试「DeepSeek」「中训练」或「五子棋」。";
      list.append(empty);
    }
    const count = document.querySelector("#dm-search-count");
    if (count)
      count.textContent = words.length
        ? `${found.length} 个匹配结果`
        : "精选入口";
  }
  function openSearch(source?: HTMLElement) {
    if (input) input.value = "";
    renderResults();
    show(search, source);
    input?.focus();
  }
  document
    .querySelectorAll<HTMLElement>("[data-open-menu]")
    .forEach((b) => b.addEventListener("click", () => show(menu, b)));
  document
    .querySelectorAll<HTMLElement>("[data-open-search]")
    .forEach((b) => b.addEventListener("click", () => openSearch(b)));
  menu?.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) =>
    link.addEventListener("click", () => {
      const target = new URL(link.href, location.href);
      if (
        target.origin === location.origin &&
        target.pathname === location.pathname
      )
        menu.close();
    }),
  );
  // The same preview responds to pointer and keyboard focus.
  document
    .querySelectorAll<HTMLAnchorElement>("[data-nav-preview]")
    .forEach((link) => {
      const preview = () => {
        const description = document.querySelector(
          "[data-nav-preview-description]",
        );
        const number = document.querySelector("[data-nav-preview-number]");
        if (description)
          description.textContent = link.dataset.navPreview || "";
        if (number) number.textContent = link.dataset.navNumber || "";
        const orbits = document.querySelector<HTMLElement>(".dm-menu-orbits");
        if (orbits && !reduced.matches)
          orbits.style.transform = `translate(-50%,-50%) rotate(${Number(link.dataset.navNumber) * 35 - 90}deg)`;
      };
      link.addEventListener("pointerenter", preview);
      link.addEventListener("focus", preview);
    });
  input?.addEventListener("input", renderResults);
  search?.addEventListener("keydown", (e) => {
    const links = Array.from(
      list?.querySelectorAll<HTMLAnchorElement>("a") || [],
    );
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      links[Math.min(index + 1, links.length - 1)]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index <= 0) input?.focus();
      else links[index - 1]?.focus();
    }
    if (e.key === "Enter" && document.activeElement === input && links.length) {
      e.preventDefault();
      links[0].click();
    }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (menu?.open) menu.close();
      if (search?.open) search.close();
      else openSearch();
    }
  });
  const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-paper-tab]"),
  );
  function selectTab(index: number) {
    tabs.forEach((t, i) => {
      t.setAttribute("aria-selected", String(i === index));
      t.tabIndex = i === index ? 0 : -1;
      const panel = document.getElementById(`paper-panel-${i}`);
      if (panel) panel.hidden = i !== index;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(i));
    tab.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                tabs.length;
        selectTab(next);
        tabs[next].focus();
      }
    });
  });
  const filterButtons =
    document.querySelectorAll<HTMLButtonElement>("[data-tool-filter]");
  filterButtons.forEach((b) =>
    b.addEventListener("click", () => {
      const category = b.dataset.toolFilter;
      filterButtons.forEach((button) =>
        button.setAttribute("aria-pressed", String(button === b)),
      );
      let count = 0;
      document
        .querySelectorAll<HTMLElement>("[data-tool-category]")
        .forEach((card) => {
          card.hidden =
            category !== "ALL" && card.dataset.toolCategory !== category;
          if (!card.hidden) count++;
        });
      const status = document.querySelector("[data-tool-count]");
      if (status) status.textContent = `${count} 个小作品`;
    }),
  );
  const copy = document.querySelector<HTMLButtonElement>("[data-copy-email]");
  copy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copy.dataset.copyEmail!);
      copy.textContent = "已复制 ✓";
    } catch {
      copy.textContent = "请长按邮箱复制";
    }
  });
  try {
    const saved = JSON.parse(
      localStorage.getItem("fieldwork-progress-v1") || "null",
    );
    const resume =
      document.querySelector<HTMLAnchorElement>("#dm-resume-reading");
    const id = typeof saved?.lastRead === "string" ? saved.lastRead : "";
    if (resume && id) {
      const paper = id.startsWith("paper:")
        ? items.find((i) => i.href.endsWith("/" + id.slice(6)))
        : null;
      resume.href = paper?.href || "/fieldwork/notebook";
      resume.hidden = false;
      const text = resume.querySelector("[data-resume-text]");
      if (text)
        text.textContent = paper
          ? `上次读到 ${paper.title}`
          : "继续你的阅读与实验";
    }
  } catch {
    /* Reading remains available when browser storage is disabled. */
  }
  // Native multi-page navigation: close restored dialogs after browser back/forward.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      menu?.close();
      search?.close();
      document.body.style.overflow = "";
    }
  });
}
