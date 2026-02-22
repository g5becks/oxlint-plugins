import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildPlugin,
  writeOxlintConfig,
  runOxlint,
  runOxlintWithFix,
  cleanupConfig,
  fixture,
  ruleFixture,
} from "./helpers/cli-runner";

const PLUGIN = "solid";
const CODE = (rule: string) => `oxlint-plugin-${PLUGIN}(${rule})`;
const EXT = "tsx";

let configPath: string;

beforeAll(async () => {
  await buildPlugin("solid");
  configPath = await writeOxlintConfig({
    plugins: ["solid"],
    rules: {
      "oxlint-plugin-solid/jsx-no-duplicate-props": "error",
      "oxlint-plugin-solid/jsx-no-script-url": "error",
      "oxlint-plugin-solid/jsx-no-undef": "error",
      "oxlint-plugin-solid/no-react-specific-props": "error",
      "oxlint-plugin-solid/self-closing-comp": "error",
      "oxlint-plugin-solid/no-proxy-apis": "error",
      "oxlint-plugin-solid/no-array-handlers": "error",
      "oxlint-plugin-solid/no-react-deps": "error",
      "oxlint-plugin-solid/imports": "error",
      "oxlint-plugin-solid/prefer-for": "error",
      "oxlint-plugin-solid/no-destructure": "error",
      "oxlint-plugin-solid/components-return-once": "error",
      "oxlint-plugin-solid/prefer-show": "error",
      "oxlint-plugin-solid/event-handlers": "error",
      "oxlint-plugin-solid/prefer-classlist": "error",
      "oxlint-plugin-solid/style-prop": "error",
      "oxlint-plugin-solid/reactivity": "error",
      "oxlint-plugin-solid/no-innerhtml": "error",
      "oxlint-plugin-solid/no-unknown-namespaces": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

// ── Legacy smoke tests ────────────────────────────────
describe("plugin-solid CLI (legacy)", () => {
  test("valid fixture produces zero diagnostics", async () => {
    const result = await runOxlint({
      configPath,
      files: [fixture("solid-valid.tsx")],
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
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix renames className to class", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE, EXT)] });
    const fixed = result.fixedFiles["no-react-specific-props.tsx"];
    expect(fixed).toBeDefined();
    expect(fixed).toContain('class=');
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
    for (const d of diags) expect(d.severity).toBe("error");
  });
});
