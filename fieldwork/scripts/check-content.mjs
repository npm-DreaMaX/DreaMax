import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const files = fs
  .readdirSync(path.join(root, "src/content"))
  .filter((f) => f.endsWith(".json"));
const articles = files.map((f) =>
  JSON.parse(fs.readFileSync(path.join(root, "src/content", f), "utf8")),
);
const sources = fs
  .readdirSync("src/data")
  .filter((f) => /^sources.*\.json$/.test(f))
  .flatMap((f) =>
    JSON.parse(fs.readFileSync(path.join("src/data", f), "utf8")),
  );
const ids = new Set(sources.map((s) => s.id)),
  slugs = new Set(articles.map((a) => a.slug));
const tracks = new Set([
  "data",
  "pretraining",
  "midtraining",
  "posttraining",
  "agentic",
  "evaluation",
  "serving",
  "systems",
  "foundations",
]);
const labs = new Set([
  "gradients",
  "data-mixture",
  "mixture",
  "moe",
  "preference",
  "agent-loop",
  "agent",
  "rollout",
  "evaluation",
  "systems",
]);
const errors = [];
if (ids.size !== sources.length) errors.push("Duplicate source IDs");
if (slugs.size !== articles.length) errors.push("Duplicate article slugs");
for (const a of articles) {
  for (const key of [
    "slug",
    "title",
    "subtitle",
    "track",
    "order",
    "minutes",
    "difficulty",
    "description",
    "prerequisites",
    "learningGoals",
    "sources",
    "body",
  ])
    if (a[key] === undefined) errors.push(`${a.slug}: missing ${key}`);
  if (!tracks.has(a.track)) errors.push(`${a.slug}: invalid track`);
  if (a.body.length < 1800) errors.push(`${a.slug}: incomplete chapter`);
  if (a.lab && !labs.has(a.lab))
    errors.push(`${a.slug}: unknown experiment ${a.lab}`);
  if ((a.body.match(/^```/gm) || []).length % 2)
    errors.push(`${a.slug}: unclosed code fence`);
  for (const id of new Set([
    ...a.sources,
    ...Array.from(a.body.matchAll(/\/sources#([\w-]+)/g), (m) => m[1]),
  ]))
    if (!ids.has(id)) errors.push(`${a.slug}: missing source ${id}`);
  for (const slug of Array.from(
    a.body.matchAll(/\/learn\/([\w-]+)/g),
    (m) => m[1],
  ))
    if (!slugs.has(slug)) errors.push(`${a.slug}: broken chapter link ${slug}`);
}
for (const s of sources) {
  if (!/^https:\/\//.test(s.url)) errors.push(`${s.id}: bad URL`);
  if (s.type === "官方源码" && s.file && !s.version)
    errors.push(`${s.id}: source without version`);
}
console.log(
  `${articles.length} chapters; ${sources.length} sources; ${articles.reduce((n, a) => n + a.body.length, 0).toLocaleString()} body characters`,
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  "Content schema, internal links, source IDs and code fences passed.",
);
