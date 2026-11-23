import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROOT,
  buildPlugin,
  cleanupConfig,
  markedLines,
  reportedLines,
  runOxlint,
  runOxlintWithFix,
  writeOxlintConfig,
} from "./helpers/cli-runner";
import { diagnostics, introducedDiagnostics } from "./helpers/ts-diagnostics.ts";
import solidjs from "../../packages/solidjs/src/index.ts";

// Solid 2.0 (TASK-043 onward): each tests/cli/fixtures/solidjs-v2/<rule>.tsx is linted by real oxlint
// with only that rule and settings.solidjs.version 2; the reported lines must equal the lines
// marked `// report`. Rules that only exist for 2.0 must report nothing on it at version 1.
const DIR = join(ROOT, "tests", "cli", "fixtures", "solidjs-v2");
const FIXTURES = readdirSync(DIR)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ rule: f.replace(/\.tsx$/, ""), file: join(DIR, f) }));

/** Rules that report nothing at version 1 (TASK-043: nothing is "removed" on 1.x). */
export const V2_ONLY_RULES = new Set<string>([
  "no-removed-apis",
  "effect-split",
  "no-write-in-reactive-scope",
  "no-classlist",
  "reconcile-key",
  "no-cleanup-in-ref",
  "for-keyed-literal",
]);

const configs: string[] = [];
afterAll(async () => {
  for (const c of configs) await cleanupConfig(c);
});

async function lint(rule: string, file: string, version?: 2) {
  await buildPlugin("solidjs");
  const configPath = await writeOxlintConfig({
    plugins: ["solidjs"],
    rules: { [`solidjs/${rule}`]: "error" },
    ...(version ? { settings: { solidjs: { version } } } : {}),
  });
  configs.push(configPath);
  const result = await runOxlint({ configPath, files: [file] });
  expect(result.stderr).toBe("");
  return result.diagnostics.filter((d) => d.code === `solidjs(${rule})`);
}

describe("solidjs at settings.solidjs.version 2", () => {
  test("fixtures exist", () => {
    expect(FIXTURES.length).toBeGreaterThan(0);
  });

  for (const { rule, file } of FIXTURES) {
    test(`${rule}: reports exactly the marked lines`, async () => {
      expect(reportedLines(await lint(rule, file, 2))).toEqual(await markedLines(file));
    });

    if (V2_ONLY_RULES.has(rule)) {
      test(`${rule}: reports nothing at version 1`, async () => {
        expect(await lint(rule, file)).toEqual([]);
      });
    }
  }
});

// The version-2 autofixes are agentx's migration codemod (TASK-045): one oxlint --fix run applies
// them, a second run changes nothing, and no fixable report is left.
const FIX_DIR = join(ROOT, "tests", "cli", "fixtures", "fix-safety", "solidjs-v2");
const FIX_FIXTURES = readdirSync(FIX_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ rule: f.replace(/\.tsx$/, ""), file: join(FIX_DIR, f) }));

/** Messages of reports that carry a fix, per rule; none may remain after --fix. */
const FIXABLE_MESSAGES: Record<string, RegExp> = {
  "no-removed-apis": /^`\w+` is `\w+` in Solid 2\.0\.$|^In Solid 2\.0 a context is its own provider: use/,
  "effect-split": /returns a value that isn't a cleanup function/,
  imports: /^Prefer importing \w+ from|is "[^"]+" in Solid 2\.0\.$/,
  "no-classlist": /^`classList` is removed in Solid 2\.0/,
  "event-handlers": /is an attribute in Solid 2\.0, not an event handler|should be renamed to/,
  "reconcile-key": /takes the key as its second argument, not an options object/,
  "no-destructure": /^Destructuring component props breaks Solid's reactivity; use property access instead\.$/,
};

describe("version-2 autofixes are idempotent", () => {
  for (const { rule, file } of FIX_FIXTURES) {
    test(`${rule}: one --fix run is a fixed point`, async () => {
      await buildPlugin("solidjs");
      const configPath = await writeOxlintConfig({
        plugins: ["solidjs"],
        rules: { [`solidjs/${rule}`]: "error" },
        settings: { solidjs: { version: 2 } },
      });
      configs.push(configPath);
      const name = `${rule}.tsx`;
      const first = (await runOxlintWithFix({ configPath, files: [file] })).fixedFiles[name] ?? "";
      expect(first).not.toBe(await Bun.file(file).text());

      const dir = await mkdtemp(join(tmpdir(), "solidjs-v2-fix-"));
      try {
        const once = join(dir, name);
        await Bun.write(once, first);
        const second = await runOxlintWithFix({ configPath, files: [once] });
        expect(second.fixedFiles[name]).toBe(first);
        const pattern = FIXABLE_MESSAGES[rule];
        expect(pattern).toBeDefined();
        expect(second.diagnostics.filter((d) => pattern!.test(d.message)).map((d) => d.message)).toEqual([]);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  }
});

// The version-2 codemod (TASK-048, TASK-060): every fixable rule of recommended-v2 fixes one file
// together. Rules' fixes may overlap, so oxlint --fix can need more than one run; the result must
// reach a fixed point within CODEMOD_RUNS runs, then stay, and parse and type-check (no new
// TypeScript errors). CODEMOD_RUNS is the bound documented in docs/migration-solid2.md: oxlint
// applies one non-overlapping set of fixes per run, and several rules' fixes touch the import block,
// so the worst-case fixture (full-migration.tsx, every rule on one file) needs 3 runs; agentx's
// client (6a54ef4) needed 2.
const CODEMOD_RUNS = 3;
const presets = (solidjs as unknown as { configs: Record<string, { rules: Record<string, string> }> }).configs;
const pluginRules = (solidjs as unknown as { rules: Record<string, { meta?: { fixable?: string } }> }).rules;
const CODEMOD_RULES = Object.entries(presets["recommended-v2"]!.rules)
  .filter(([key, severity]) => severity !== "off" && pluginRules[key.slice("solidjs/".length)]?.meta?.fixable)
  .map(([key]) => key);

describe("version-2 codemod converges", () => {
  test("covers every fixable recommended-v2 rule", () => {
    expect(CODEMOD_RULES).toContain("solidjs/no-removed-apis");
    expect(CODEMOD_RULES).toContain("solidjs/imports");
    expect(CODEMOD_RULES.length).toBeGreaterThanOrEqual(10);
  });

  const DIR_C = join(ROOT, "tests", "cli", "fixtures", "solidjs-v2-codemod");
  for (const name of readdirSync(DIR_C).filter((f) => f.endsWith(".tsx"))) {
    test(`${name}: a fixed point within ${CODEMOD_RUNS} --fix runs, and it type-checks`, async () => {
      await buildPlugin("solidjs");
      const configPath = await writeOxlintConfig({
        plugins: ["solidjs"],
        rules: Object.fromEntries(CODEMOD_RULES.map((r) => [r, "error"])),
        settings: { solidjs: { version: 2 } },
      });
      configs.push(configPath);
      const dir = await mkdtemp(join(tmpdir(), "solidjs-v2-codemod-"));
      try {
        const file = join(dir, name);
        const input = await Bun.file(join(DIR_C, name)).text();
        let text = input;
        const history = [text];
        for (let run = 0; run < CODEMOD_RUNS + 1; run++) {
          await Bun.write(file, text);
          text = (await runOxlintWithFix({ configPath, files: [file] })).fixedFiles[name] ?? "";
          history.push(text);
        }
        // Run CODEMOD_RUNS + 1 changed nothing: the fixed point was reached within the bound.
        expect(history.at(-1)).toBe(history.at(-2));
        expect(history.at(-1)).not.toBe(input);
        const before = diagnostics(`/virtual/input.tsx`, input);
        const after = diagnostics(`/virtual/output.tsx`, history.at(-1)!);
        expect(after.syntactic).toEqual([]);
        expect(introducedDiagnostics(before, after)).toEqual([]);
        const final = history.at(-1)!;
        expect(final).not.toContain("solid-js/store");
        expect(final).toContain("<Loading");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  }
});
