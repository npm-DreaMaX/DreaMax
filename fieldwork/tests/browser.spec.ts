import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const articles = fs
  .readdirSync("src/content")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join("src/content", f), "utf8")));
test("editorial home stage explorer and navigation", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.locator(".intro-heading h1")).toContainText("把前沿论文");
  const heading = await page.locator(".intro-heading h1").boundingBox();
  expect(heading!.x + heading!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  expect(heading!.height).toBeLessThan(isMobile ? 170 : 250);
  await page
    .locator(".field-stage-switch")
    .getByRole("tab", { name: /中训练/ })
    .click();
  await expect(page.locator(".field-caption h2")).toHaveText("Mid-training");
  if (isMobile) await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("link", { name: "阅读路线", exact: true }).click();
  await expect(page).toHaveURL(/paths\/pretraining/);
  await expect(page.locator(".sequence-item")).toHaveCount(6);
});
test("paper full-text search and keyboard dismissal", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const dialog = page.locator(".paper-search");
  await expect(dialog).toBeVisible();
  await page
    .getByRole("textbox", { name: "搜索论文与正文" })
    .fill("policy lag");
  await expect(
    dialog.locator(".paper-search-results>button").first(),
  ).toBeVisible();
  await dialog.locator(".paper-search-results>button").first().click();
  await expect(page).toHaveURL(/papers\//);
  await expect(dialog).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await page
    .getByRole("textbox", { name: "搜索论文与正文" })
    .fill("没有这个词0123456");
  await expect(dialog).toContainText("没有匹配");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
test("chapter progress and notes persist; math and source links render", async ({
  page,
}) => {
  await page.goto("/learn/gradient-bridge");
  await expect(page.locator(".prose .katex").first()).toBeVisible();
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await page.getByRole("button", { name: "标记已读", exact: true }).click();
  await page
    .getByRole("textbox", { name: "本章学习笔记" })
    .fill("验证共享计算图的梯度累加");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已完成阅读", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "本章学习笔记" })).toHaveValue(
    "验证共享计算图的梯度累加",
  );
  await page.goto("/notebook");
  await expect(page.locator(".saved-note")).toContainText("验证共享计算图");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习记录" }).click();
  expect((await dl).suggestedFilename()).toBe("fieldwork-notes.md");
});
test("gradient control runs a genuine forward/backward/update", async ({
  page,
}) => {
  await page.goto("/labs/gradients");
  await expect(page.locator(".lab-metric").first()).toContainText("8.0000");
  await page.getByRole("button", { name: "① 前向计算" }).click();
  await page.getByRole("button", { name: "② 反向传播" }).click();
  await expect(page.locator(".gradient-labels")).toContainText("-8.00");
  await page.getByRole("button", { name: "③ 更新参数" }).click();
  await expect(page.locator(".lab-metric").first()).toContainText("2.0000");
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.locator(".lab-metric").first()).toContainText("8.0000");
});
test("rollout mode and freshness change computed results", async ({ page }) => {
  await page.goto("/labs/rollout");
  const before = await page.locator(".lab-metric").first().innerText();
  await page.getByRole("button", { name: "同步", exact: true }).click();
  expect(await page.locator(".lab-metric").first().innerText()).not.toBe(
    before,
  );
  await expect(page.locator(".worker-row .stale")).toHaveCount(0);
  await page.getByRole("button", { name: "异步", exact: true }).click();
  await page.getByRole("slider", { name: "允许的策略版本差" }).fill("0");
  await expect(page.locator(".worker-row .stale").first()).toBeVisible();
});
test("source anchors expand the exact source and filters work", async ({
  page,
}) => {
  await page.goto("/sources#verl-agent-loop");
  const source = page.locator("#verl-agent-loop");
  await expect(source.locator(".source-detail")).toBeVisible();
  await expect(
    source.locator("a", { hasText: "打开原始来源" }),
  ).toHaveAttribute("href", /github.com/);
  await page.getByRole("textbox", { name: "筛选来源" }).fill("DPO");
  await expect(page.locator(".source-record").first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "筛选来源" })
    .fill("nonexistent-source-123");
  await expect(page.getByText("没有匹配的来源")).toBeVisible();
});
test("dark mode persists across reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("all chapters load without console errors, invalid math or page overflow", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const a of articles) {
    await page.goto("/learn/" + a.slug);
    await expect(page.locator(".article-body>h1")).toHaveText(a.title);
    await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      a.slug,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("all experiment routes render without overflow", async ({ page }) => {
  for (const lab of [
    "gradients",
    "data-mixture",
    "preference",
    "agent-loop",
    "rollout",
    "moe",
    "evaluation",
    "systems",
  ]) {
    await page.goto("/labs/" + lab);
    await expect(page.locator(".lab-board")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      lab,
    ).toBe(true);
  }
});
test("frontier cases connect current official releases to source evidence", async ({
  page,
}) => {
  await page.goto("/models");
  await page.getByRole("button", { name: "DeepSeek", exact: true }).click();
  await expect(page.locator(".model-feature h2")).toContainText("V4.1");
  await page.getByRole("button", { name: "Qwen", exact: true }).click();
  await expect(page.locator(".model-feature h2")).toContainText("3.8");
  await page.getByRole("button", { name: "MiMo", exact: true }).click();
  await expect(page.locator(".model-feature h2")).toContainText("2.6");
  await page.locator(".model-evidence a").first().click();
  await expect(page).toHaveURL(/sources#/);
  await expect(
    page.locator(".source-record.is-target .source-detail"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("systems memory sharding and live teaching-source viewer work", async ({
  page,
}) => {
  await page.goto("/labs/systems");
  await expect(page.locator(".lab-metric").first()).toContainText("117.3");
  await page.getByRole("checkbox", { name: "查看完全分片状态内存" }).check();
  await expect(page.locator(".lab-metric").first()).toContainText("14.7");
  await page
    .getByRole("button", { name: "展开实验源码、配置与调试指南" })
    .click();
  await expect(page.locator(".source-file-label")).toContainText(
    "labs/systems.py",
  );
  await expect(page.locator(".source-code-scroll pre")).toContainText("def ");
  await page.getByRole("button", { name: "实验配置", exact: true }).click();
  await expect(page.locator(".source-file-label")).toContainText(
    "systems.json",
  );
  await page
    .getByRole("button", { name: "运行与调试指南", exact: true })
    .click();
  await expect(page.locator(".lab-source-view .prose")).toContainText("通信");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

const papers = fs
  .readdirSync("src/papers")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join("src/papers", f), "utf8")));
test("every paper renders its original figures, citations and mathematics", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const p of papers) {
    await page.goto("/papers/" + p.id);
    await expect(page.locator(".paper-header h1")).toHaveText(p.title);
    await expect(page.locator(".paper-section")).toHaveCount(p.sections.length);
    await expect(page.locator(".source-locator")).toHaveCount(
      p.sections.length,
    );
    await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(
      await page
        .locator(".paper-hero-figure img")
        .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
      p.id,
    ).toBe(true);
    const bounds = await page.locator(".paper-header h1").boundingBox();
    expect(bounds!.x + bounds!.width, p.id).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      p.id,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("paper library combines stage, category and full-text filters", async ({
  page,
}) => {
  await page.goto("/papers");
  await expect(page.locator(".paper-list-row")).toHaveCount(15);
  await page.getByRole("button", { name: "中训练", exact: true }).click();
  await expect(page.locator(".paper-list-row")).toHaveCount(5);
  await page.getByRole("button", { name: "前沿报告", exact: true }).click();
  await expect(page.locator(".paper-list-row")).toHaveCount(3);
  await page.getByRole("textbox", { name: "筛选论文" }).fill("Muown");
  await expect(page.locator(".paper-list-row")).toHaveCount(1);
  await page.locator(".paper-list-row").click();
  await expect(page).toHaveURL(/mimo-v26/);
});
test("paper original figure modal, focus mode, notes and export", async ({
  page,
}) => {
  await page.goto("/papers/qwen3");
  await page.getByRole("button", { name: "只看重点", exact: true }).click();
  await expect(page.locator(".paper-section")).toHaveCount(3);
  await page.getByRole("button", { name: /放大原图/ }).click();
  await expect(page.locator(".figure-dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".figure-dialog[open]")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "本篇论文笔记" })
    .fill("S2 同时改变数据配比和学习率衰减。");
  await page
    .locator(".note-status")
    .getByRole("button", { name: "标记已读", exact: true })
    .click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "本篇论文笔记" })).toHaveValue(
    "S2 同时改变数据配比和学习率衰减。",
  );
  await expect(
    page
      .locator(".paper-header-actions")
      .getByRole("button", { name: "已完成阅读" }),
  ).toBeVisible();
  await page.goto("/notebook");
  await expect(page.locator(".saved-note")).toContainText("S2 同时改变");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习记录" }).click();
  expect((await download).suggestedFilename()).toBe("fieldwork-notes.md");
});
test("all five paths link to existing sections", async ({ page }) => {
  for (const stage of [
    "pretraining",
    "midtraining",
    "posttraining",
    "agentic",
    "systems",
  ]) {
    await page.goto("/paths/" + stage);
    const links = await page
      .locator(".sequence-focus .text-action")
      .evaluateAll((es) => es.map((e) => e.getAttribute("href")!));
    for (const href of links) {
      const match = href.match(/\/papers\/([^#]+)#(.+)/)!;
      const p = papers.find((p) => p.id === match[1]);
      expect(
        p.sections.some((s: { id: string }) => s.id === match[2]),
        href,
      ).toBe(true);
    }
    await page.locator(".sequence-focus .text-action").first().click();
    const hash = new URL(page.url()).hash;
    await expect(page.locator(hash)).toBeVisible();
  }
});

test("training stage comparison distinguishes data, context and optimizer changes", async ({
  page,
}) => {
  await page.goto("/paths/midtraining");
  await expect(page.locator(".timeline-detail")).toContainText("4,096");
  await expect(page.locator(".timeline-detail")).toContainText(
    "加快学习率衰减",
  );
  await page
    .getByRole("button", { name: "MiMo-V2.6-Flash", exact: true })
    .click();
  await page.getByRole("button", { name: /Mid-training.*未披露/ }).click();
  await expect(page.locator(".timeline-detail")).toContainText("Muown");
  await expect(page.locator(".timeline-detail")).toContainText("256K → 1M");
  await expect(page.locator(".timeline-insight")).toContainText("48T");
  await page.locator(".timeline-insight a").click();
  await expect(page).toHaveURL(/papers\/mimo-v26#midtraining/);
});
