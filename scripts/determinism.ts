/**
 * Determinism check: build every plugin, then lint a corpus (CLI + bench fixtures and the agentx-client corpus)
 * N times multi-threaded with every rule of all six plugins, and print a hash of the sorted,
 * normalized diagnostics per run. Identical hashes = no cross-file state leaks (audit R9/R10).
 *
 *   bun scripts/determinism.ts [repo-root] [runs=3]
 */

import { $ } from "bun";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { REPO_ROOT } from "./plugins.ts";
const root = resolve(process.argv[2] ?? REPO_ROOT);
const runs = Number(process.argv[3] ?? 3);
const names = ["errorset", "immutable", "ts-no-assert", "query", "router", "solidjs"];
await $`bun run build`.cwd(root).quiet();
const rules: Record<string, string> = {};
const jsPlugins: string[] = [];
for (const n of names) {
  const dist = join(root, "packages", n, "dist", "index.js");
  jsPlugins.push(dist);
  const mod = (await import(dist)).default;
  for (const r of Object.keys(mod.rules)) rules[`${n}/${r}`] = "error";
}
const dir = mkdtempSync(join(tmpdir(), "determinism-"));
const cfg = join(dir, ".oxlintrc.json");
await Bun.write(cfg, JSON.stringify({ jsPlugins, rules }));
const targets = ["tests/cli/fixtures", "tests/bench/fixtures", "tests/fixtures/corpus"].map((p) => join(root, p));
const bin = join(root, "node_modules/.bin/oxlint");
for (let i = 1; i <= runs; i++) {
  const out = await $`${bin} -c ${cfg} -A all --format json ${targets}`.cwd(root).nothrow().quiet();
  const diags = JSON.parse(out.stdout.toString()).diagnostics as any[];
  const lines = diags
    .map(
      (d) =>
        `${d.filename.replace(root, "")}:${d.labels?.[0]?.span?.line}:${d.labels?.[0]?.span?.column} ${d.code} ${d.message}`,
    )
    .sort();
  const hash = createHash("sha256").update(lines.join("\n")).digest("hex");
  const jsxUndef = lines.filter((l) => l.includes("jsx-no-undef")).length;
  console.log(`run ${i}: ${lines.length} diagnostics, jsx-no-undef ${jsxUndef}, sha256 ${hash.slice(0, 16)}`);
}
