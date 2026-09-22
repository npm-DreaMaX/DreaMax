import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
execFileSync(process.execPath, ["scripts/check-content.mjs"], {
  cwd: "fieldwork",
  stdio: "inherit",
});
const papers = fs
  .readdirSync("fieldwork/src/papers")
  .filter((f) => f.endsWith(".json"))
  .map((f) => read("fieldwork/src/papers/" + f));
const figures = read("fieldwork/src/data/paper-figures.json");
const manifests = read("fieldwork/research/papers/manifest.json");
const sources = fs
  .readdirSync("fieldwork/src/data")
  .filter((f) => /^sources.*\.json$/.test(f))
  .flatMap((f) => read("fieldwork/src/data/" + f));
const ids = new Set(papers.map((p) => p.id));
assert.equal(ids.size, papers.length);
for (const p of papers) {
  assert(
    sources.some((s) => s.id === p.sourceId),
    `${p.id}: source missing`,
  );
  assert(
    manifests.some((m) => m.id === p.id && /^[a-f0-9]{64}$/.test(m.sha256)),
    `${p.id}: PDF provenance missing`,
  );
  assert(p.sections.length >= 3, `${p.id}: incomplete reading`);
  for (const s of p.sections) {
    assert(s.body.length > 180);
    assert(s.locator.includes("PDF p."));
  }
  for (const c of p.connections)
    assert(ids.has(c.id), `${p.id}: missing connected reading`);
}
for (const f of figures) {
  const asset = path.join("public", f.src);
  assert(fs.existsSync(asset), `${f.id}: missing figure`);
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(asset)).digest("hex"),
    f.assetSha256,
    `${f.id}: changed original figure`,
  );
}
for (const p of ["machine-learning", "magic-corner"])
  assert(
    fs
      .readFileSync(`src/pages/${p}/index.astro`, "utf8")
      .includes("Astro.redirect('/llm-training/'"),
  );
for (const p of ["agentic-scholar", "algorithms"])
  assert(
    !fs
      .readFileSync(`src/pages/${p}/index.astro`, "utf8")
      .includes("TopicPage"),
  );
assert(
  fs
    .readFileSync("src/pages/index.astro", "utf8")
    .includes("<ResearchHighlights />"),
);
assert(
  fs
    .readFileSync("src/pages/index.astro", "utf8")
    .includes("<TrainingEntry />"),
);
const projects = fs.readFileSync("src/data/featured.ts", "utf8");
for (const name of ["Triple-pi", "TripleTeam", "TokenCircuit"])
  assert(projects.includes(`https://github.com/npm-DreaMaX/${name}`));
assert(!projects.includes("Project Name"));
assert(
  !fs.readFileSync("src/data/profile.ts", "utf8").includes("graph machine"),
);
console.log(
  `Integration valid: ${papers.length} papers, ${papers.reduce((n, p) => n + p.sections.length, 0)} sections, ${figures.length} unchanged paper figures, ${sources.length} sources.`,
);
