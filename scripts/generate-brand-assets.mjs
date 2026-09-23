/** Rasterize the licensed-font SVG assets. See docs/visual-sources.md for provenance. */
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const icon = await fs.readFile("public/favicon.svg", "utf8");
const sizes = [16, 32, 48, 256],
  buffers = [];
for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{width:100%;height:100%;display:block}</style>${icon}`,
  );
  buffers.push(await page.screenshot({ omitBackground: true }));
  await page.close();
}
// ICO supports PNG payloads; directory offsets are relative to the file header.
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const at = 6 + i * 16;
  header[at] = header[at + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(buffers[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += buffers[i].length;
});
await fs.writeFile("public/favicon.ico", Buffer.concat([header, ...buffers]));
const cover = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await cover.setContent(
  `<style>body{margin:0}</style>${await fs.readFile("public/social-cover.svg", "utf8")}`,
);
await cover.screenshot({ path: "public/social-cover.png" });
await browser.close();
console.log(
  "Generated favicon.ico and social-cover.png from the original SVG sources.",
);
