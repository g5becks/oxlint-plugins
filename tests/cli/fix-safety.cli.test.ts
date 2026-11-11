import { afterAll, describe, expect, test } from "bun:test";
import ts from "typescript";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import type { PluginName } from "../../scripts/plugins.ts";
import { buildPlugin, cleanupConfig, ruleFixture, runOxlintWithFix, writeOxlintConfig } from "./helpers/cli-runner";

// Audit T5 / R3: `oxlint --fix` runs in consumers' hooks, so every autofix must produce code that
// still parses and type-checks. For each fixable rule (meta.fixable), its CLI fixture is fixed by
// real oxlint with only that rule enabled; the output must differ from the input, have no syntax
// errors, and introduce no TypeScript diagnostics that the original didn't already have (fixtures
// import packages that aren't installed, so pre-existing errors are compared away).
const plugins = { errorset, immutable, "ts-no-assert": tsNoAssert, query, router, solidjs } as unknown as Record<
  PluginName,
  { rules: Record<string, { meta?: { fixable?: string } }> }
>;
const FIXABLE = (Object.keys(plugins) as PluginName[]).flatMap((p) =>
  Object.entries(plugins[p].rules)
    .filter(([, rule]) => rule.meta?.fixable)
    .map(([rule]) => ({ plugin: p, rule })),
);

/** Rules whose fixtures only produce suggestions (not applied by --fix): output must equal input. */
const SUGGESTION_ONLY = new Set(["query/exhaustive-deps"]);

function diagnostics(fileName: string, text: string) {
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: false,
    skipLibCheck: true,
    noResolve: true,
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile;
  host.getSourceFile = (name, lang) =>
    name === fileName ? ts.createSourceFile(name, text, lang, true) : original.call(host, name, lang);
  const program = ts.createProgram([fileName], options, host);
  const sf = program.getSourceFile(fileName);
  const fmt = (d: ts.Diagnostic) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
  return {
    syntactic: program.getSyntacticDiagnostics(sf).map(fmt),
    semantic: program.getSemanticDiagnostics(sf).map(fmt),
  };
}

const configs: string[] = [];
afterAll(async () => {
  for (const c of configs) await cleanupConfig(c);
});

describe("fix safety: oxlint --fix output parses and type-checks", () => {
  test("every fixable rule is covered", () => {
    expect(FIXABLE.length).toBeGreaterThanOrEqual(19);
  });

  for (const { plugin, rule } of FIXABLE) {
    test(`${plugin}/${rule}`, async () => {
      await buildPlugin(plugin);
      // A dedicated fixture (tests/cli/fixtures/fix-safety/<plugin>/<rule>) when the shared
      // rule fixture has no auto-fixable case; the shared fixtures' line numbers are asserted elsewhere.
      const candidates = ["tsx", "ts"].flatMap((e) => [
        { ext: e, file: ruleFixture(`fix-safety/${plugin}`, rule, e) },
        { ext: e, file: ruleFixture(plugin, rule, e) },
      ]);
      const dedicated = candidates
        .filter((c) => c.file.includes("/fix-safety/"))
        .find((c) => Bun.file(c.file).size > 0);
      const { ext, file } = dedicated ?? candidates.find((c) => Bun.file(c.file).size > 0) ?? { ext: "ts", file: "" };
      const configPath = await writeOxlintConfig({ plugins: [plugin], rules: { [`${plugin}/${rule}`]: "error" } });
      configs.push(configPath);
      const input = await Bun.file(file).text();
      const result = await runOxlintWithFix({ configPath, files: [file] });
      expect(result.stderr).not.toContain("Error running JS plugin");
      const output = result.fixedFiles[`${rule}.${ext}`] ?? "";

      if (SUGGESTION_ONLY.has(`${plugin}/${rule}`)) {
        expect(output).toBe(input);
        return;
      }
      expect(output).not.toBe(input);

      const before = diagnostics(`/virtual/input.${ext}`, input);
      const after = diagnostics(`/virtual/output.${ext}`, output);
      expect(after.syntactic).toEqual([]);
      // Imports the fix adds can't resolve here (fixture packages aren't installed): ignore
      // module-resolution errors, nothing else.
      const resolution = /^TS(2307|2792):/;
      const remaining = [...before.semantic];
      const introduced = after.semantic.filter((d) => {
        if (resolution.test(d)) return false;
        const i = remaining.indexOf(d);
        if (i === -1) return true;
        remaining.splice(i, 1);
        return false;
      });
      expect(introduced).toEqual([]);
    });
  }
});
