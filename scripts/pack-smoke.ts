/**
 * Pack-and-install smoke test for every published package.
 *
 * For each oxlint version: create a temp consumer, `npm install` that exact
 * oxlint plus every package tarball, load each plugin through `jsPlugins` by
 * package name, and lint one fixture with one rule. A plugin passes when it
 * loads without errors and reports exactly the expected diagnostic code.
 *
 *   bun scripts/pack-smoke.ts                          # pack from packages/*, pinned oxlint
 *   bun scripts/pack-smoke.ts --oxlint 1.70.0,1.93.0
 *   bun scripts/pack-smoke.ts --tarballs <dir>         # verify existing *.tgz (release)
 *
 * Packages must be built first (`bun run build`) unless --tarballs is given.
 * Needs Node and npm on PATH (oxlint runs JS plugins on Node).
 */
import { $ } from "bun";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PLUGIN_NAMES, PLUGINS, type PluginName, REPO_ROOT, distEntry, packageDir } from "./plugins.ts";

/** One rule per plugin and a CLI fixture that must trigger it. */
const SMOKE: Record<PluginName, { rule: string; fixture: string }> = {
  errorset: { rule: "no-throw-errorset", fixture: "tests/cli/fixtures/errorset/no-throw-errorset.ts" },
  immutable: { rule: "no-let", fixture: "tests/cli/fixtures/immutable/no-let.ts" },
  "ts-no-assert": { rule: "no-type-assertion", fixture: "tests/cli/fixtures/ts-no-assert/no-type-assertion.ts" },
  query: { rule: "no-rest-destructuring", fixture: "tests/cli/fixtures/query/no-rest-destructuring.ts" },
  router: { rule: "route-param-names", fixture: "tests/cli/fixtures/router/route-param-names.ts" },
  solidjs: { rule: "jsx-no-script-url", fixture: "tests/cli/fixtures/solidjs/jsx-no-script-url.tsx" },
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function pinnedOxlint(): Promise<string> {
  const pkg = await Bun.file(join(REPO_ROOT, "package.json")).json();
  return pkg.devDependencies.oxlint;
}

const versions = (arg("--oxlint") ?? (await pinnedOxlint())).split(",").filter(Boolean);
const work = mkdtempSync(join(tmpdir(), "oxlint-pack-smoke-"));
let failed = false;

try {
  // 1. Tarballs: given, or packed now from the built packages.
  let tarballDir = arg("--tarballs");
  if (!tarballDir) {
    tarballDir = join(work, "tarballs");
    for (const name of PLUGIN_NAMES) {
      if (!(await Bun.file(distEntry(name)).exists())) {
        throw new Error(`${distEntry(name)} is missing; run \`bun run build\` first`);
      }
      await $`bun pm pack --destination ${tarballDir} --quiet`.cwd(packageDir(name)).quiet();
    }
  }
  const tarballs = readdirSync(tarballDir).filter((f) => f.endsWith(".tgz"));
  const byPlugin = new Map<PluginName, string>();
  for (const name of PLUGIN_NAMES) {
    const tgz = tarballs.find((f) => f.startsWith(`${PLUGINS[name].packageName}-`) && /-\d+\.\d+\.\d+.*\.tgz$/.test(f));
    if (!tgz) throw new Error(`no tarball for ${PLUGINS[name].packageName} in ${tarballDir}`);
    byPlugin.set(name, join(tarballDir, tgz));
  }

  // 2. Tarball contents: dist bundle, manifest, README; no sources.
  for (const [name, tgz] of byPlugin) {
    const files = (await $`tar -tzf ${tgz}`.text()).split("\n").filter(Boolean);
    const missing = ["package/package.json", "package/README.md", "package/dist/index.js"].filter(
      (f) => !files.includes(f),
    );
    const extra = files.filter((f) => !/^package\/(package\.json|README\.md|CHANGELOG\.md|LICENSE|dist\/.+)$/.test(f));
    const ok = missing.length === 0 && extra.length === 0;
    console.log(`${ok ? "ok  " : "FAIL"} contents ${name}${ok ? "" : ` missing=${missing} unexpected=${extra}`}`);
    if (!ok) failed = true;
  }

  // 3. Install into a consumer per oxlint version and lint.
  for (const version of versions) {
    const consumer = join(work, `consumer-${version}`);
    await Bun.write(
      join(consumer, "package.json"),
      JSON.stringify({ name: "smoke-consumer", private: true, type: "module" }),
    );
    await $`npm install --no-audit --no-fund --silent ${`oxlint@${version}`} ${[...byPlugin.values()]}`
      .cwd(consumer)
      .quiet();
    const actual = (await $`node_modules/.bin/oxlint --version`.cwd(consumer).text())
      .replace(/^Version:\s*/, "")
      .trim();

    for (const name of PLUGIN_NAMES) {
      const { rule, fixture } = SMOKE[name];
      const ext = fixture.endsWith(".tsx") ? "tsx" : "ts";
      const dir = join(consumer, `lint-${name}`);
      await Bun.write(join(dir, `fixture.${ext}`), Bun.file(join(REPO_ROOT, fixture)));
      await Bun.write(
        join(dir, ".oxlintrc.json"),
        JSON.stringify({ jsPlugins: [PLUGINS[name].packageName], rules: { [`${name}/${rule}`]: "error" } }),
      );
      const res = await $`../node_modules/.bin/oxlint -c .oxlintrc.json --format json -A all fixture.${ext}`
        .cwd(dir)
        .nothrow()
        .quiet();
      let codes: string[] = [];
      try {
        codes = (JSON.parse(res.stdout.toString()).diagnostics ?? []).map((d: { code: string }) => d.code);
      } catch {
        codes = [`<unparseable output: ${res.stdout.toString().slice(0, 200)} ${res.stderr.toString().slice(0, 200)}>`];
      }
      const expected = `${name}(${rule})`;
      const ok = codes.length > 0 && codes.every((c) => c === expected);
      console.log(
        `${ok ? "ok  " : "FAIL"} oxlint ${actual} ${name}: ${codes.length} x ${ok ? expected : codes.join(", ")}`,
      );
      if (!ok) failed = true;
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(failed ? "pack-smoke: FAIL" : "pack-smoke: PASS");
process.exit(failed ? 1 : 0);
