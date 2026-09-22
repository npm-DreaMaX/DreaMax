import { test as base, expect } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      if (url.includes("/fieldwork/"))
        await expect(page.locator("html")).toHaveAttribute(
          "data-fieldwork-ready",
          "true",
        );
      return response;
    };
    await use(page);
  },
});
export { expect };
