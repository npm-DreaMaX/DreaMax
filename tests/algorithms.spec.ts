import { test, expect } from "./fixtures";
test("author algorithm library filters, searches, sorts, and restores deep links", async ({
  page,
}) => {
  await page.goto("/algorithms/");
  const articles = page.locator("[data-algorithm-article]:visible");
  await expect(articles).toHaveCount(11);
  for (const link of await page
    .locator("[data-algorithm-article]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href"))))
    expect(link).toMatch(
      /^https:\/\/blog\.csdn\.net\/2401_88204232\/article\/details\/\d+$/,
    );
  await expect(page.locator("main")).not.toContainText("GSAR-Tree");
  await page.getByRole("button", { name: /字符串与哈希/ }).click();
  await expect(articles).toHaveCount(3);
  await page.getByRole("searchbox", { name: "搜索我的算法文章" }).fill("KMP");
  await expect(articles).toHaveCount(2);
  await page.reload();
  await expect(articles).toHaveCount(2);
  await expect(
    page.getByRole("searchbox", { name: "搜索我的算法文章" }),
  ).toHaveValue("KMP");
  await page
    .getByRole("searchbox", { name: "搜索我的算法文章" })
    .fill("不存在的题目9876");
  await expect(articles).toHaveCount(0);
  await page.getByRole("button", { name: "显示全部文章" }).click();
  await expect(articles).toHaveCount(11);
  await page.getByLabel("文章排序", { exact: true }).selectOption("oldest");
  await expect(articles.first()).toContainText("P1618");
  await page.getByLabel("文章排序", { exact: true }).selectOption("newest");
  await expect(articles.first()).toContainText("F. Quests");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("the immersive home keeps signature effects and exposes the next section on scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".hero-backdrop img")).toBeVisible();
  await expect(page.locator("h1 .orbix-x")).toHaveText("x");
  await expect(page.locator("[data-terminal-slogan]")).toBeVisible();
  await page.locator("h1").click();
  await expect(page.locator(".click-code-particle").first()).toBeAttached();
  await expect(page.locator(".click-code-ripple")).toBeAttached();
  const logo = await page.locator("h1").boundingBox();
  const slogan = await page.locator("[data-terminal-slogan]").boundingBox();
  expect(logo && slogan && slogan.y + slogan.height <= logo.y + 5).toBe(true);
  await page.getByRole("link", { name: "向下探索网站栏目" }).click();
  await expect(page.locator("#explore")).toBeInViewport();
  await page.locator('#algorithm a[href="/algorithms/"]').click();
  await expect(page.locator("#algorithm-heading")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const state = await page
    .locator(".hero-backdrop picture")
    .evaluate((el) => getComputedStyle(el).transform);
  expect(state).toBe("none");
  await page.locator("h1").click();
  await expect(page.locator(".click-code-particle")).toHaveCount(0);
});

test("home training stages and agent trajectory respond to keyboard and touch", async ({
  page,
}) => {
  await page.goto("/");
  const mid = page.getByRole("tab", { name: /Mid-training/ });
  await mid.click();
  await expect(page.locator("#phase-panel-1")).toBeVisible();
  await expect(page.locator("#phase-panel-0")).toBeHidden();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Agentic RL/ })).toBeFocused();
  await expect(page.locator("#phase-panel-3 a")).toHaveAttribute(
    "href",
    "/fieldwork/paths/agentic",
  );
  await page.getByRole("button", { name: /回放下一步/ }).click();
  await expect(page.locator("[data-agent-title]")).toHaveText("执行动作");
  await page.locator('[data-agent-step="3"]').click();
  await expect(page.locator("[data-agent-title]")).toHaveText("验证结果");
  await expect(page.locator('[data-agent-step="3"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /回放下一步/ }).click();
  await expect(page.locator("[data-agent-number]")).toHaveText("01");
});
