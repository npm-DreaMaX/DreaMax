import { test, expect } from "./fixtures";

test("3D scenes load near the viewport, rotate, expand and follow the training and project tabs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const training = page.locator('[data-spatial-scene="training"]');
  await expect(page.locator('[data-spatial-scene="projects"]')).toHaveAttribute(
    "data-render",
    "waiting",
  );
  await training.scrollIntoViewIfNeeded();
  await expect(training).toHaveAttribute("data-render", "webgl", {
    timeout: 15000,
  });
  await training
    .getByRole("button", { name: "暂停训练参数形态动画", exact: true })
    .click();
  await expect(training).toHaveAttribute("data-paused", "true");
  const before = await training.locator("canvas").screenshot();
  await training.locator(".spatial-canvas-frame").focus();
  await page.keyboard.press("ArrowRight");
  const after = await training.locator("canvas").screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  await page.keyboard.press("2");
  await expect(page.locator("#phase-tab-1")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(training).toHaveAttribute("data-state", "1");
  await training
    .getByRole("button", { name: "展开训练参数形态", exact: true })
    .click();
  await expect(training).toHaveAttribute("data-expanded", "true");
  await page.getByRole("tab", { name: /TokenCircuit/ }).click();
  const projects = page.locator('[data-spatial-scene="projects"]');
  await projects.scrollIntoViewIfNeeded();
  await expect(projects).toHaveAttribute("data-render", "webgl", {
    timeout: 15000,
  });
  await expect(projects).toHaveAttribute("data-state", "2");
  await expect(training).toHaveAttribute("data-visible", "false");
  await projects.locator(".spatial-canvas-frame").focus();
  await page.keyboard.press("1");
  await expect(page.locator("#project-tab-0")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#project-panel-0")).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion starts every 3D scene paused while controls and agent steps still work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator('[data-agent-step="2"]').click();
  const scene = page.locator("#research [data-spatial-scene]");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-render", "webgl", {
    timeout: 15000,
  });
  await expect(scene).toHaveAttribute("data-paused", "true");
  await expect(scene).toHaveAttribute("data-state", "2");
  await scene.locator(".spatial-canvas-frame").focus();
  await page.keyboard.press("4");
  await expect(page.locator("[data-agent-title]")).toHaveText("验证结果");
  await scene
    .getByRole("button", { name: "展开Agent 轨迹", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-expanded", "true");
  await expect(scene).toHaveAttribute("data-paused", "true");
});

test("no WebGL leaves a static illustration with working links and disabled 3D controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (type.includes("webgl")) return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto("/agentic-scholar/");
  const scene = page.locator("[data-spatial-scene]");
  await expect(scene).toHaveAttribute("data-render", "fallback", {
    timeout: 15000,
  });
  await expect(scene.locator(".spatial-fallback")).toBeVisible();
  await expect(scene.locator("[data-spatial-expand]")).toBeDisabled();
  await expect(page.locator(".scholar-source").first()).toBeVisible();
  await page
    .locator(".scholar-reading")
    .first()
    .locator(".scholar-related")
    .click();
  await expect(page).toHaveURL(/fieldwork\/learn\/agent-boundaries/);
});

test("sorting demo compares real values, completes in 36 comparisons and resets", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const demo = page.locator("[data-sorting-scene]");
  await demo.locator("[data-sort-step]").click();
  await expect(demo).toHaveAttribute("data-sort-values", "2,6,8,4,1,7,3,9,5");
  for (let i = 1; i < 36; i++) await demo.locator("[data-sort-step]").click();
  await expect(demo).toHaveAttribute("data-sort-values", "1,2,3,4,5,6,7,8,9");
  await expect(demo.locator("[data-sort-status]")).toHaveText("排序完成");
  await expect(demo.locator("[data-sort-step]")).toBeDisabled();
  await demo.locator("[data-sort-reset]").click();
  await expect(demo).toHaveAttribute("data-sort-values", "6,2,8,4,1,7,3,9,5");
  await expect(demo).toHaveAttribute("data-comparisons", "0");
});
