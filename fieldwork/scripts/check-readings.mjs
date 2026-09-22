import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const papers = fs
  .readdirSync("src/papers")
  .filter((f) => f.endsWith(".json"))
  .map((f) => read(path.join("src/papers", f)));
const sources = fs
  .readdirSync("src/data")
  .filter((f) => /^sources.*\.json$/.test(f))
  .flatMap((f) => read(path.join("src/data", f)));
const figures = read("src/data/paper-figures.json");
const manifests = read("research/papers/manifest.json");
const ids = new Set(papers.map((p) => p.id));
const sourceIds = new Set(sources.map((s) => s.id));
const chapters = new Set(
  fs
    .readdirSync("src/content")
    .filter((f) => f.endsWith(".json"))
    .map((f) => read(path.join("src/content", f)).slug),
);
const validStages = new Set([
  "pretraining",
  "midtraining",
  "posttraining",
  "agentic",
  "systems",
]);
const validLabs = new Set([
  "gradients",
  "data-mixture",
  "preference",
  "moe",
  "agent-loop",
  "rollout",
  "evaluation",
  "systems",
]);
const errors = [];
const assert = (cond, msg) => {
  if (!cond) errors.push(msg);
};
for (const m of manifests) {
  assert(fs.existsSync(m.pdfPath), `${m.id}: original PDF missing`);
  if (fs.existsSync(m.pdfPath)) {
    assert(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(m.pdfPath))
        .digest("hex") === m.sha256,
      `${m.id}: original PDF hash mismatch`,
    );
  }
}
assert(ids.size === papers.length, "Duplicate paper ID");
for (const p of papers) {
  const m = manifests.find((m) => m.id === p.id);
  assert(!!m, `${p.id}: missing PDF snapshot`);
  for (const k of [
    "id",
    "title",
    "subtitle",
    "organization",
    "year",
    "kind",
    "stages",
    "tags",
    "question",
    "why",
    "minutes",
    "sourceId",
    "cover",
    "sections",
    "takeaways",
    "connections",
    "lab",
    "codeChapter",
  ])
    assert(p[k] !== undefined, `${p.id}: missing ${k}`);
  assert(sourceIds.has(p.sourceId), `${p.id}: unregistered source`);
  assert(
    figures.some((f) => f.id === p.cover && f.paper === p.id),
    `${p.id}: wrong cover`,
  );
  assert(chapters.has(p.codeChapter), `${p.id}: broken source chapter`);
  assert(validLabs.has(p.lab), `${p.id}: invalid lab`);
  assert(p.sections.length >= 3, `${p.id}: no developed reading`);
  assert(
    p.stages.every((s) => validStages.has(s)),
    `${p.id}: invalid stage`,
  );
  assert(
    new Set(p.sections.map((s) => s.id)).size === p.sections.length,
    `${p.id}: duplicate section`,
  );
  for (const s of p.sections) {
    assert(s.body.length > 180, `${p.id}/${s.id}: incomplete prose`);
    assert(s.locator.includes("PDF p."), `${p.id}/${s.id}: no page locator`);
    assert(validStages.has(s.stage), `${p.id}/${s.id}: invalid stage`);
    const page = Number(s.locator.match(/p\.(\d+)/)?.[1]);
    assert(page > 0 && page <= m.pages, `${p.id}/${s.id}: invalid PDF page`);
    for (const f of s.figures || []) {
      assert(
        figures.some((g) => g.id === f.id && g.paper === p.id),
        `${p.id}: incorrect figure ${f.id}`,
      );
      assert(f.notes.length >= 2, `${f.id}: no figure interpretation`);
    }
  }
  for (const c of p.connections)
    assert(ids.has(c.id), `${p.id}: broken connection ${c.id}`);
}
for (const f of figures) {
  const m = manifests.find((m) => m.id === f.paper);
  const file = "public" + f.src;
  assert(fs.existsSync(file), `${f.id}: missing asset`);
  if (fs.existsSync(file))
    assert(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(file))
        .digest("hex") === f.assetSha256,
      `${f.id}: asset hash mismatch`,
    );
  assert(f.pdfSha256 === m?.sha256, `${f.id}: incorrect PDF provenance`);
  assert(f.page > 0 && f.page <= m.pages, `${f.id}: invalid figure page`);
  assert(
    f.width > 0 && f.height > 0 && f.crop.length === 4,
    `${f.id}: missing extraction bounds`,
  );
}
console.log(
  `${papers.length} readings; ${papers.reduce((n, p) => n + p.sections.length, 0)} sections; ${figures.length} attributed original figures.`,
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  "Reading schemas, section sources, experiments, cross-links and figure provenance passed.",
);
