import { test, expect } from "./fixtures";

test("the photographic light field animates, pauses and stops outside the viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  const hero = page.locator("#dreamax");
  await expect(hero).toHaveAttribute("data-optics", "ready", {
    timeout: 15000,
  });
  // The canvas extends beyond the viewport for parallax. Screenshot a fixed
  // unobstructed region; a full element capture resizes the responsive viewport.
  const photograph = () =>
    page.screenshot({ clip: { x: 24, y: 120, width: 160, height: 160 } });
  const moving = await photograph();
  await page.waitForTimeout(400);
  expect(Buffer.compare(moving, await photograph())).not.toBe(0);
  await page.getByRole("button", { name: "暂停背景动效", exact: true }).click();
  await expect(hero).toHaveAttribute("data-optics-paused", "true");
  // Wait for the independent CSS pointer parallax to settle before comparing pixels.
  await page.waitForTimeout(1200);
  await expect(page.locator(".click-code-particle")).toHaveCount(0);
  const paused = await photograph();
  await page.waitForTimeout(150);
  expect(Buffer.compare(paused, await photograph())).toBe(0);
  await page.getByRole("button", { name: "播放背景动效", exact: true }).click();
  await page.locator("#training").scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-optics-visible", "false");
  expect(errors).toEqual([]);
});

test("material and lighting controls change the rendered sculpture and comparison supports keyboard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const scene = page.locator('[data-spatial-scene="training"]');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-render", "webgl", {
    timeout: 15000,
  });
  await scene
    .getByRole("button", { name: "调节训练参数形态", exact: true })
    .click();
  const metallic = await scene.locator("canvas").screenshot();
  await scene.getByRole("button", { name: "磨砂", exact: true }).click();
  await expect(
    scene.getByRole("button", { name: "磨砂", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    Buffer.compare(metallic, await scene.locator("canvas").screenshot()),
  ).not.toBe(0);
  await scene.getByRole("button", { name: "金属", exact: true }).click();
  const light = scene.getByRole("slider", { name: "训练参数形态光线方向" });
  await light.focus();
  await page.keyboard.press("End");
  await expect(scene.locator("[data-spatial-light-value]")).toHaveText("180°");
  expect(
    Buffer.compare(metallic, await scene.locator("canvas").screenshot()),
  ).not.toBe(0);
  const speed = scene.getByRole("slider", { name: "训练参数形态运动速度" });
  await speed.focus();
  await page.keyboard.press("Home");
  await expect(scene.locator("[data-spatial-speed-value]")).toHaveText("0.0×");
  const comparison = page.getByRole("slider", { name: "图像前后对比" });
  await comparison.focus();
  await page.keyboard.press("End");
  await expect(page.locator(".comparison-control output")).toHaveText("98%");
  await page.keyboard.press("Home");
  await expect(page.locator(".comparison-control output")).toHaveText("2%");
  // Visit the shader-based project too: shader compilation failures are console errors.
  await page.getByRole("tab", { name: /TokenCircuit/ }).click();
  await page.locator("#projects [data-spatial-scene]").scrollIntoViewIfNeeded();
  await expect(page.locator("#projects [data-spatial-scene]")).toHaveAttribute(
    "data-render",
    "webgl",
  );
  await page.locator("#projects canvas").screenshot();
  expect(errors).toEqual([]);
});

test("reduced motion keeps the original photo and changing the preference enables the light field", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero-backdrop img")).toBeVisible();
  await expect(page.locator("[data-hero-motion]")).toBeHidden();
  await expect(page.locator(".portfolio-quote")).toContainText(
    "With resolve I depart;",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#dreamax")).toHaveAttribute(
    "data-optics",
    "ready",
    { timeout: 15000 },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#dreamax")).toHaveAttribute(
    "data-optics",
    "static",
  );
  await expect(page.locator("[data-hero-motion]")).toBeHidden();
});
