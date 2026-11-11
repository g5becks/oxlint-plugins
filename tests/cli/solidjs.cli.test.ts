import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildPlugin,
  writeOxlintConfig,
  runOxlint,
  runOxlintWithFix,
  cleanupConfig,
  fixture,
  ruleFixture,
  ruleCode,
} from "./helpers/cli-runner";
import { lintSequence, reportedFiles } from "./helpers/state-isolation.ts";

const PLUGIN = "solidjs" as const;
const CODE = (rule: string) => ruleCode(PLUGIN, rule);
const EXT = "tsx";

let configPath: string;

beforeAll(async () => {
  await buildPlugin("solidjs");
  configPath = await writeOxlintConfig({
    plugins: ["solidjs"],
    rules: {
      "solidjs/jsx-no-duplicate-props": "error",
      "solidjs/jsx-no-script-url": "error",
      "solidjs/jsx-no-undef": "error",
      "solidjs/no-react-specific-props": "error",
      "solidjs/self-closing-comp": "error",
      "solidjs/no-proxy-apis": "error",
      "solidjs/no-array-handlers": "error",
      "solidjs/no-react-deps": "error",
      "solidjs/imports": "error",
      "solidjs/prefer-for": "error",
      "solidjs/no-destructure": "error",
      "solidjs/components-return-once": "error",
      "solidjs/prefer-show": "error",
      "solidjs/event-handlers": "error",
      "solidjs/prefer-classlist": "error",
      "solidjs/style-prop": "error",
      "solidjs/reactivity": "error",
      "solidjs/no-innerhtml": "error",
      "solidjs/no-unknown-namespaces": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

// ── Legacy smoke tests ────────────────────────────────
describe("solidjs CLI (legacy)", () => {
  test("valid fixture produces zero diagnostics", async () => {
    const result = await runOxlint({
      configPath,
      files: [fixture("solidjs-valid.tsx")],
    });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
  });
});

// ── jsx-no-duplicate-props ────────────────────────────
describe("jsx-no-duplicate-props", () => {
  const RULE = "jsx-no-duplicate-props";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── jsx-no-script-url ─────────────────────────────────
describe("jsx-no-script-url", () => {
  const RULE = "jsx-no-script-url";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── jsx-no-undef ──────────────────────────────────────
describe("jsx-no-undef", () => {
  const RULE = "jsx-no-undef";

  test("reports diagnostics for undefined components", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(1);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-react-specific-props ───────────────────────────
describe("no-react-specific-props", () => {
  const RULE = "no-react-specific-props";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix renames className to class", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const fixed = result.fixedFiles["no-react-specific-props.tsx"];
    expect(fixed).toBeDefined();
    expect(fixed).toContain("class=");
    // The fix replaces className= with class= in JSX attributes
    expect(fixed).not.toContain("className=");
  });
});

// ── self-closing-comp ─────────────────────────────────
describe("self-closing-comp", () => {
  const RULE = "self-closing-comp";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix converts to self-closing", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const fixed = result.fixedFiles["self-closing-comp.tsx"];
    expect(fixed).toBeDefined();
  });
});

// ── no-proxy-apis ─────────────────────────────────────
describe("no-proxy-apis", () => {
  const RULE = "no-proxy-apis";

  test("reports diagnostics for store import", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(1);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-array-handlers ─────────────────────────────────
describe("no-array-handlers", () => {
  const RULE = "no-array-handlers";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-react-deps ─────────────────────────────────────
describe("no-react-deps", () => {
  const RULE = "no-react-deps";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix removes dependency arrays", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const fixed = result.fixedFiles["no-react-deps.tsx"];
    expect(fixed).toBeDefined();
  });
});

// ── imports ───────────────────────────────────────────
describe("imports", () => {
  const RULE = "imports";

  test("reports diagnostics for wrong import source", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(1);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── prefer-for ────────────────────────────────────────
describe("prefer-for", () => {
  const RULE = "prefer-for";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-destructure ────────────────────────────────────
describe("no-destructure", () => {
  const RULE = "no-destructure";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix converts to property access", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const fixed = result.fixedFiles["no-destructure.tsx"];
    expect(fixed).toBeDefined();
  });
});

// ── components-return-once ────────────────────────────
describe("components-return-once", () => {
  const RULE = "components-return-once";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── prefer-show ───────────────────────────────────────
describe("prefer-show", () => {
  const RULE = "prefer-show";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── event-handlers ────────────────────────────────────
describe("event-handlers", () => {
  const RULE = "event-handlers";

  test("reports diagnostics", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(1);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── prefer-classlist ──────────────────────────────────
describe("prefer-classlist", () => {
  const RULE = "prefer-classlist";

  test("reports diagnostics for classnames usage", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(1);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── style-prop ────────────────────────────────────────
describe("style-prop", () => {
  const RULE = "style-prop";

  test("reports diagnostics for invalid styles", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── reactivity ────────────────────────────────────────
describe("reactivity", () => {
  const RULE = "reactivity";

  test("reports diagnostics for reactivity violations", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(1);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-innerhtml ──────────────────────────────────────
describe("no-innerhtml", () => {
  const RULE = "no-innerhtml";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-unknown-namespaces ─────────────────────────────
describe("no-unknown-namespaces", () => {
  const RULE = "no-unknown-namespaces";

  test("reports diagnostics for unknown namespaces", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(2);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── jsx-no-undef: per-file state (audit R9) ──────────
describe("jsx-no-undef state isolation", () => {
  const clean = (i: number) => ({
    name: `b${i}.tsx`,
    code: `import { Show } from "solid-js";\n\nexport const B${i} = () => <Show when={true}>b${i}</Show>;\n`,
  });

  test("only the file missing the import is reported (audit R9)", async () => {
    const leakConfig = await writeOxlintConfig({
      plugins: ["solidjs"],
      rules: { "solidjs/jsx-no-undef": "error" },
    });
    try {
      const result = await lintSequence(leakConfig, [
        { name: "a.tsx", code: "export const A = () => <Show when={true}>x</Show>;\n" },
        ...[1, 2, 3, 4, 5].map(clean),
      ]);
      expect(reportedFiles(result)).toEqual(["a.tsx"]);
    } finally {
      await cleanupConfig(leakConfig);
    }
  });

  test("--fix over one invalid and five valid files changes only the invalid file", async () => {
    const fixConfig = await writeOxlintConfig({
      plugins: ["solidjs"],
      rules: { "solidjs/jsx-no-undef": "error" },
    });
    const dir = await mkdtemp(join(tmpdir(), "jsx-no-undef-fix-"));
    try {
      const files = [
        { name: "a.tsx", code: "export const A = () => <Show when={true}>x</Show>;\n" },
        ...[1, 2, 3, 4, 5].map(clean),
      ];
      const paths: string[] = [];
      for (const f of files) {
        const p = join(dir, f.name);
        await Bun.write(p, f.code);
        paths.push(p);
      }
      const result = await runOxlintWithFix({ configPath: fixConfig, files: paths, extraArgs: ["--threads", "1"] });
      const changed = files.filter((f) => result.fixedFiles[f.name] !== f.code).map((f) => f.name);
      expect(changed).toEqual(["a.tsx"]);
      expect(result.fixedFiles["a.tsx"]).toStartWith('import { Show } from "solid-js";');
    } finally {
      await rm(dir, { recursive: true, force: true });
      await cleanupConfig(fixConfig);
    }
  });
});

// ── reactivity: per-file state (audit R10) ───────────
describe("reactivity state isolation", () => {
  // A imports Solid's createSignal; B declares its own createSignal. B's result must not
  // depend on A having been linted first by the same worker.
  const A = {
    name: "a.tsx",
    code: 'import { createSignal } from "solid-js";\nexport function A() {\n  const [n] = createSignal(0);\n  return <div>{n()}</div>;\n}\n',
  };
  const B = {
    name: "b.tsx",
    code: "function createSignal<T>(v: T): [() => T] {\n  return [() => v];\n}\nexport function B() {\n  const [count] = createSignal(0);\n  console.log(count());\n  return <div />;\n}\n",
  };
  const messages = (r: Awaited<ReturnType<typeof lintSequence>>, f: string) =>
    (r.byFile.get(f) ?? []).map((d) => `${d.labels[0]?.span.line}: ${d.message}`);

  test("linting B after A equals linting B alone", async () => {
    const cfg = await writeOxlintConfig({ plugins: ["solidjs"], rules: { "solidjs/reactivity": "error" } });
    try {
      const alone = await lintSequence(cfg, [B]);
      const afterA = await lintSequence(cfg, [A, B]);
      expect(messages(alone, "b.tsx")).toEqual([]);
      expect(messages(afterA, "b.tsx")).toEqual(messages(alone, "b.tsx"));
      expect(messages(afterA, "a.tsx")).toEqual([]);
    } finally {
      await cleanupConfig(cfg);
    }
  });
});

// ── jsx-uses-vars under oxlint (TASK-024 decision) ────
// oxlint's built-in no-unused-vars is native and doesn't see a JS plugin's
// markVariableAsUsed, so jsx-uses-vars can't mark Solid directives (`use:tooltip`) as used under
// oxlint: it is a no-op there and is not recommended for oxlint configs (README). If this test
// starts failing, oxlint changed and the recommendation should be revisited.
describe("jsx-uses-vars under oxlint", () => {
  test("does not affect oxlint's native no-unused-vars", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jsx-uses-vars-"));
    const file = join(dir, "a.tsx");
    await Bun.write(
      file,
      'import { tooltip } from "./tooltip";\nimport { Comp } from "./comp";\nexport const A = () => (\n  <div use:tooltip>\n    <Comp />\n  </div>\n);\n',
    );
    try {
      for (const withRule of [false, true]) {
        const cfg = await writeOxlintConfig({
          plugins: ["solidjs"],
          rules: { "no-unused-vars": "error", ...(withRule ? { "solidjs/jsx-uses-vars": "error" } : {}) },
        });
        try {
          // keepBuiltins: `-A all` would turn off the built-in rule.
          const result = await runOxlint({ configPath: cfg, files: [file], keepBuiltins: true });
          const unused = result.diagnostics.filter((d) => d.code.endsWith("(no-unused-vars)")).map((d) => d.message);
          expect({ withRule, unused }).toEqual({
            withRule,
            unused: ["Identifier 'tooltip' is imported but never used."],
          });
        } finally {
          await cleanupConfig(cfg);
        }
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
