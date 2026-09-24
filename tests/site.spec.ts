import { test, expect } from "./fixtures";

test("the new homepage exposes peer destinations and three real projects", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("DreaMax");
  await expect(page.locator(".portfolio-quote")).toContainText(
    "With resolve I depart;",
  );
  await expect(page.locator(".portfolio-quote")).toContainText(
    "in greater glory I shall return.",
  );
  await expect(page.locator(".portfolio-focus")).toHaveText(
    "LLM training & RSI",
  );
  await expect(
    page.locator('#research a[href="/agentic-scholar/"]'),
  ).toBeVisible();
  await expect(page.locator(".portfolio-project-grid")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Selected Research");
  for (const name of ["Triple-pi", "TripleTeam", "TokenCircuit"]) {
    await page.getByRole("tab", { name: new RegExp(name) }).click();
    await expect(
      page.locator(
        `.project-source-link[href="https://github.com/npm-DreaMaX/${name}"]`,
      ),
    ).toBeVisible();
  }
  await expect(page.locator(".project-source-link")).toHaveCount(3);
  await expect(page.locator(".home-training-entry")).toHaveAttribute(
    "href",
    "/llm-training/",
  );
  await expect(page.locator("#tools .playground-piece")).toHaveCount(3);
  await expect(page.locator("[data-sculpture]")).toHaveCount(0);
});

test("LLM Training has the immersive experience and opens the full reading site", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/llm-training/");
  await expect(page.locator("#hero-title")).toContainText("Training.");
  await expect(page.locator("[data-sculpture]")).toHaveAttribute(
    "data-render",
    /webgl|fallback/,
  );
  if (
    (await page.locator("[data-sculpture]").getAttribute("data-render")) ===
    "webgl"
  ) {
    await page.getByRole("button", { name: "轨道", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "轨道", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "暂停雕塑动画" }).click();
    await expect(
      page.getByRole("button", { name: "播放雕塑动画" }),
    ).toBeVisible();
    await page.locator(".dm-sculpture-stage").focus();
    await page.keyboard.press("ArrowRight");
  }
  await page.getByRole("tab", { name: /DeepSeek/ }).click();
  await expect(page.locator("#paper-panel-1")).toBeVisible();
  await expect(page.locator("#paper-panel-0")).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Kimi/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page
    .locator("#paper-panel-2")
    .getByRole("link", { name: /展开这篇精读/ })
    .click();
  await expect(page).toHaveURL(/\/fieldwork\/papers\/kimi-k3/);
  await expect(page.locator(".paper-header h1")).toHaveText("Kimi K3");
  await page
    .getByRole("link", { name: "返回 LLM Training", exact: true })
    .first()
    .click();
  await expect(page.locator("#hero-title")).toBeVisible();
  await page
    .locator(".dm-header")
    .getByRole("link", { name: "DreaMax 首页", exact: true })
    .click();
  await expect(page.locator(".portfolio-nameplate")).toBeVisible();
  expect(errors).toEqual([]);
});

test("six peer sections and five learning paths in accessible full-screen navigation", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "打开全站导航" });
  await trigger.click();
  const menu = page.locator("#dm-menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator(".dm-menu-main a")).toHaveCount(6);
  await expect(menu.locator(".dm-menu-paths a")).toHaveCount(5);
  await expect(menu).not.toContainText("Magic Corner");
  await expect(menu).not.toContainText("Machine Learning");
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("#dm-menu")),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.locator('.dm-menu-main a[href="/llm-training/"]').click();
  await expect(page).toHaveURL(/llm-training/);
  await expect(page.locator("#hero-title")).toBeVisible();
});

test("page curtain completes; browser back and same-page menu anchors remain usable", async ({
  page,
}) => {
  await page.goto("/");
  const phase = await page
    .locator(".home-training-entry")
    .evaluate((el: HTMLAnchorElement) => {
      el.click();
      return document.documentElement.dataset.routeTransition;
    });
  expect(phase).toBe("exit");
  await expect(page).toHaveURL(/llm-training/);
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-route-transition",
  );
  await page.goBack();
  await expect(page.locator(".portfolio-nameplate")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-route-transition",
  );
  await page.getByRole("button", { name: "打开全站导航" }).click();
  await page
    .locator("#dm-menu")
    .getByRole("link", { name: "开源项目 ↗", exact: true })
    .click();
  await expect(page.locator("#dm-menu")).toBeHidden();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator("#projects")).toBeInViewport();
});

test("global search supports projects, keyboard, empty results and paper deep links", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByRole("searchbox").fill("TripleTeam");
  await expect(page.locator("#dm-search-results a").first()).toHaveAttribute(
    "href",
    "https://github.com/npm-DreaMaX/TripleTeam",
  );
  await page.getByRole("searchbox").fill("中训练");
  await expect(page.locator("#dm-search-results a").first()).toBeVisible();
  await page.getByRole("searchbox").fill("does-not-exist-67453");
  await expect(page.locator("#dm-search-results")).toContainText("还没找到");
  await page.getByRole("searchbox").fill("DeepSeek-V4.1");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/fieldwork\/papers\/deepseek-v41/);
});

test("all seven tools remain accessible and profile reflects new focus", async ({
  page,
}) => {
  await page.goto("/tools/");
  for (const slug of [
    "gomoku",
    "beautifier",
    "tempmail",
    "checkin",
    "fileshare",
    "rewriter",
    "mbti",
  ])
    await expect(page.locator(`main a[href="/tools/${slug}"]`)).toBeVisible();
  await page.getByRole("button", { name: "创造", exact: true }).click();
  await expect(page.locator("[data-tool-category]:visible")).toHaveCount(2);
  await expect(page.locator("[data-tool-count]")).toHaveText("2 个小作品");
  await page.getByRole("button", { name: "全部作品", exact: true }).click();
  await expect(page.locator("[data-tool-category]:visible")).toHaveCount(7);
  await page.goto("/join/");
  await expect(page.locator("[data-terminal-slogan]")).toBeVisible();
  await page
    .getByRole("button", { name: "Change The World — 点击重播跳动文字" })
    .click();
  await expect(page.locator(".ts-world .cl")).toHaveCount(14);
  await expect(page.locator("main")).toContainText(
    "重点探索现代预训练和 Agentic RL",
  );
  await expect(page.locator("main")).not.toContainText("图机器学习");
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "3752703718@qq.com", exact: true }),
  ).toHaveAttribute("href", "mailto:3752703718@qq.com");
});

test("scholar reading panels keep source links and the original reading archive", async ({
  page,
}) => {
  await page.goto("/agentic-scholar/");
  await expect(page.locator(".scholar-reading")).toHaveCount(3);
  await page.locator(".scholar-reading").nth(2).locator("summary").click();
  await expect(
    page.locator(".scholar-reading").nth(2).locator(".scholar-source"),
  ).toHaveAttribute("href", "https://arxiv.org/abs/2510.16907");
  await page.locator(".scholar-archive summary").click();
  for (const title of ["Deep Residual Learning", "NeoVerse", "MegaSaM"])
    await expect(page.locator(".scholar-archive")).toContainText(title);
  await page
    .locator(".scholar-reading")
    .first()
    .locator(".scholar-related")
    .click();
  await expect(page).toHaveURL(/fieldwork\/learn\/agent-boundaries/);
  await expect(page.locator("h1")).toBeVisible();
});

test("personal pages fit viewport and retired categories redirect to the new area", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/tools/",
    "/join/",
    "/llm-training/",
    "/agentic-scholar/",
    "/algorithms/",
    "/machine-learning/",
    "/magic-corner/",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBe(true);
    await expect(page.locator(".dm-header")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Project Name");
    if (["/machine-learning/", "/magic-corner/"].includes(path))
      await expect(page).toHaveURL(/llm-training/);
  }
  expect(errors).toEqual([]);
});

test("paper HTML and portfolio navigation exist without JavaScript", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/");
  await page.locator(".home-training-entry").click();
  await expect(page.locator("#hero-title")).toBeVisible();
  await page
    .getByRole("link", { name: "开始学习", exact: false })
    .first()
    .click();
  await expect(page.locator(".editorial-app")).toBeVisible();
  await page.goto("http://127.0.0.1:4322/fieldwork/papers/mimo-v26/");
  await expect(page.locator(".paper-section")).toHaveCount(7);
  await expect(page.locator(".paper-header h1")).toHaveText("MiMo-V2.6");
  await context.close();
  const response = await request.get("/magic-corner/ai-charging/");
  expect(await response.text()).toContain("/fieldwork/papers/qwen38");
});

test("reduced motion and notes survive the boundary between portfolio and reader", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/llm-training/");
  if (
    (await page.locator("[data-sculpture]").getAttribute("data-render")) ===
    "webgl"
  )
    await expect(
      page.getByRole("button", { name: "播放雕塑动画" }),
    ).toBeVisible();
  await page.goto("/fieldwork/papers/qwen3");
  await expect(page.locator(".paper-header h1")).toHaveText("Qwen3");
  await page
    .getByRole("textbox", { name: "本篇论文笔记" })
    .fill("记录来自 DreaMax 集成测试");
  await page.goto("/llm-training/");
  await expect(page.locator("#dm-resume-reading")).toBeVisible();
  await page.locator("#dm-resume-reading").click();
  await expect(page).toHaveURL(/papers\/qwen3/);
  await expect(page.getByRole("textbox", { name: "本篇论文笔记" })).toHaveValue(
    "记录来自 DreaMax 集成测试",
  );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-route-transition",
  );
});

test("learning disclosure supports keyboard, dismissal and direct route links", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.locator("[data-training-toggle]");
  if (await toggle.isVisible()) {
    await expect(page.locator("#dm-training-menu")).toBeHidden();
    await toggle.focus();
    await page.keyboard.press("ArrowDown");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#dm-training-menu a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#dm-training-menu")).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.mouse.click(40, 650);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await page
      .locator('#dm-training-menu a[href="/fieldwork/paths/pretraining"]')
      .click();
    await expect(page).toHaveURL(/fieldwork\/paths\/pretraining/);
  } else {
    await page.locator(".dm-mobile-training").click();
    await expect(page).toHaveURL(/llm-training/);
  }
});
