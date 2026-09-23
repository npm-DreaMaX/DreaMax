/** Import the author's public article index. Never reads login cookies or drafts.
 * node scripts/sync-csdn.mjs [--input /path/profile.html] [--direct]
 * --direct only disables the machine's network proxy for this public request.
 */
import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const account = "2401_88204232";
const sourceUrl = `https://blog.csdn.net/${account}`;
const args = process.argv.slice(2);
const input = args.indexOf("--input");
const html =
  input >= 0
    ? await fs.readFile(args[input + 1], "utf8")
    : execFileSync(
        "curl",
        [
          ...(args.includes("--direct") ? ["--noproxy", "*"] : []),
          "-fsSL",
          "--max-time",
          "25",
          "-A",
          "Mozilla/5.0",
          sourceUrl,
        ],
        { encoding: "utf8", maxBuffer: 4000000 },
      );
const $ = cheerio.load(html);
const articles = [];
const seen = new Set();
$(`a[href*="blog.csdn.net/${account}/article/details/"]`).each((_, el) => {
  const a = $(el),
    url = a.attr("href")?.split("?")[0];
  const id = url?.match(/\/details\/(\d+)$/)?.[1];
  const title = a.find("h4").text().trim();
  if (!id || !title || seen.has(id)) return;
  seen.add(id);
  articles.push({
    id,
    title,
    url,
    summary: a.find(".blog-list-content").text().trim(),
    updated:
      a
        .find(".view-time-box")
        .text()
        .match(/\d{4}\.\d{2}\.\d{2}/)?.[0]
        ?.replaceAll(".", "-") || null,
  });
});
if (!articles.length)
  throw new Error(
    "No public articles found. Existing data is unchanged; check for a login/verification page.",
  );
const data = {
  account,
  displayName: $("title")
    .text()
    .replace(/-CSDN博客$/, ""),
  sourceUrl,
  checkedAt: new Date().toISOString().slice(0, 10),
  articles,
};
await fs.mkdir("src/data/sources", { recursive: true });
await fs.writeFile(
  "src/data/sources/csdn-public-index.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  `Imported ${articles.length} public articles from ${sourceUrl}. Review topic metadata before publishing.`,
);
