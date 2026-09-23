export function initAlgorithmLibrary() {
  const list = document.querySelector<HTMLElement>("[data-algorithm-list]");
  const input = document.querySelector<HTMLInputElement>(
    "[data-algorithm-search]",
  );
  const select = document.querySelector<HTMLSelectElement>(
    "[data-algorithm-sort]",
  );
  if (!list || !input || !select) return;
  const rows = [
    ...list.querySelectorAll<HTMLElement>("[data-algorithm-article]"),
  ];
  const filters = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-algorithm-filter]"),
  ];
  let category = "全部";
  const apply = (updateUrl = true) => {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const sorted = [...rows].sort((a, b) =>
      select.value === "title"
        ? (a.dataset.title || "").localeCompare(b.dataset.title || "", "zh-CN")
        : (a.dataset.updated || "").localeCompare(b.dataset.updated || "") *
          (select.value === "oldest" ? 1 : -1),
    );
    let count = 0;
    for (const row of sorted) {
      row.hidden =
        !(category === "全部" || row.dataset.category === category) ||
        !terms.every((term) =>
          row.dataset.search?.toLowerCase().includes(term),
        );
      if (!row.hidden) count++;
      list.append(row);
    }
    filters.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.algorithmFilter === category),
      ),
    );
    const status = document.querySelector("[data-algorithm-count]");
    if (status) status.textContent = `${count} 篇文章`;
    const empty = document.querySelector<HTMLElement>("[data-algorithm-empty]");
    if (empty) empty.hidden = count > 0;
    if (updateUrl) {
      const url = new URL(location.href);
      if (category === "全部") url.searchParams.delete("topic");
      else url.searchParams.set("topic", category);
      if (!input.value.trim()) url.searchParams.delete("q");
      else url.searchParams.set("q", input.value.trim());
      if (select.value === "newest") url.searchParams.delete("sort");
      else url.searchParams.set("sort", select.value);
      history.replaceState(history.state, "", url);
    }
  };
  const restore = () => {
    const params = new URLSearchParams(location.search);
    category = filters.some(
      (b) => b.dataset.algorithmFilter === params.get("topic"),
    )
      ? params.get("topic")!
      : "全部";
    input.value = params.get("q") || "";
    select.value = ["oldest", "title"].includes(params.get("sort") || "")
      ? params.get("sort")!
      : "newest";
    apply(false);
  };
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      category = button.dataset.algorithmFilter || "全部";
      apply();
    }),
  );
  input.addEventListener("input", () => apply());
  select.addEventListener("change", () => apply());
  document
    .querySelector("[data-algorithm-reset]")
    ?.addEventListener("click", () => {
      category = "全部";
      input.value = "";
      select.value = "newest";
      apply();
      input.focus();
    });
  window.addEventListener("popstate", restore);
  restore();
}
