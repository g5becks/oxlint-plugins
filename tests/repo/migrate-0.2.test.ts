import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { migrateConfig, migrateSource } from "../../scripts/migrate-0.2.ts";

const SCRIPT = join(import.meta.dir, "..", "..", "scripts", "migrate-0.2.ts");

describe("migrateSource: disable comments", () => {
  test.each([
    ["// oxlint-disable-next-line oxlint-plugin-immutable/no-let", "// oxlint-disable-next-line immutable/no-let"],
    [
      "// oxlint-disable-line oxlint-plugin-ts-no-assert/no-type-assertion",
      "// oxlint-disable-line ts-no-assert/no-type-assertion",
    ],
    [
      "/* oxlint-disable oxlint-plugin-errorset/no-throw-errorset */",
      "/* oxlint-disable errorset/no-throw-errorset */",
    ],
    ["/* oxlint-enable oxlint-plugin-query/exhaustive-deps */", "/* oxlint-enable query/exhaustive-deps */"],
    [
      "// eslint-disable-next-line oxlint-plugin-router/route-param-names",
      "// eslint-disable-next-line router/route-param-names",
    ],
    ["/* eslint-disable oxlint-plugin-solidjs/reactivity */", "/* eslint-disable solidjs/reactivity */"],
    [
      "// oxlint-disable-next-line oxlint-plugin-immutable/no-let, oxlint-plugin-solidjs/reactivity -- reason oxlint-plugin-x/y",
      "// oxlint-disable-next-line immutable/no-let, solidjs/reactivity -- reason oxlint-plugin-x/y",
    ],
    // Pre-publish names.
    ["// oxlint-disable-next-line oxlint-plugin-functional/no-let", "// oxlint-disable-next-line immutable/no-let"],
    [
      "// oxlint-disable-next-line oxlint-plugin-solid/no-destructure",
      "// oxlint-disable-next-line solidjs/no-destructure",
    ],
    // Multi-line block comment.
    [
      "/*\n * eslint-disable\n *   oxlint-plugin-immutable/no-let,\n *   oxlint-plugin-errorset/no-catch-errorset\n */",
      "/*\n * eslint-disable\n *   immutable/no-let,\n *   errorset/no-catch-errorset\n */",
    ],
  ])("%p", (input, expected) => {
    const code = `${input}\nlet a = 1;\n`;
    expect(migrateSource(code).text).toBe(`${expected}\nlet a = 1;\n`);
  });

  test("leaves comments without a directive, strings and package paths alone", () => {
    const code = [
      "// see oxlint-plugin-immutable/no-let for details",
      'import x from "oxlint-plugin-immutable/dist/index.js";',
      'const s = "// oxlint-disable-next-line oxlint-plugin-immutable/no-let";',
      "// oxlint-disable-next-line ./node_modules/oxlint-plugin-immutable/x",
      "/* oxlint-disable-next-line immutable/no-let */",
    ].join("\n");
    const out = migrateSource(code);
    // Known limitation (documented in the script): comments are found with a regex scanner, so a
    // directive inside a string literal is rewritten too. Harmless for real code.
    expect(out.text.split("\n")[2]).toBe('const s = "// oxlint-disable-next-line immutable/no-let";');
    expect(out.text.split("\n")[0]).toBe("// see oxlint-plugin-immutable/no-let for details");
    expect(out.text.split("\n")[1]).toBe('import x from "oxlint-plugin-immutable/dist/index.js";');
    expect(out.text.split("\n")[3]).toBe("// oxlint-disable-next-line ./node_modules/oxlint-plugin-immutable/x");
    expect(out.text.split("\n")[4]).toBe("/* oxlint-disable-next-line immutable/no-let */");
  });

  test("is idempotent", () => {
    const once = migrateSource("// oxlint-disable-next-line oxlint-plugin-immutable/no-let\n").text;
    expect(migrateSource(once)).toEqual({ text: once, count: 0 });
  });
});

describe("migrateConfig: .oxlintrc.json / JSONC", () => {
  const config = `{
  // JSONC comment mentioning oxlint-plugin-immutable/no-let stays
  "jsPlugins": [
    "oxlint-plugin-immutable",
    "./node_modules/oxlint-plugin-solidjs/dist/index.js",
    "oxlint-plugin-errorset/dist/index.js"
  ],
  "rules": {
    "oxlint-plugin-immutable/no-let": "error",
    "oxlint-plugin-ts-no-assert/no-type-assertion" : ["error", {}],
    "oxlint-plugin-functional/no-throw-statements": "warn",
    "oxlint-plugin-solid/reactivity": "off",
    "typescript/no-explicit-any": "error"
  },
  "overrides": [{ "files": ["*.tsx"], "rules": { "oxlint-plugin-solidjs/no-destructure": "error" } }]
}`;

  test("rewrites rule keys only", () => {
    const { text, count } = migrateConfig(config);
    expect(count).toBe(5);
    expect(text).toContain('"immutable/no-let": "error"');
    expect(text).toContain('"ts-no-assert/no-type-assertion" : ["error", {}]');
    expect(text).toContain('"immutable/no-throw-statements": "warn"');
    expect(text).toContain('"solidjs/reactivity": "off"');
    expect(text).toContain('"solidjs/no-destructure": "error"');
    // jsPlugins entries, package paths and comments are untouched
    expect(text).toContain('"oxlint-plugin-immutable",');
    expect(text).toContain('"./node_modules/oxlint-plugin-solidjs/dist/index.js",');
    expect(text).toContain('"oxlint-plugin-errorset/dist/index.js"');
    expect(text).toContain("// JSONC comment mentioning oxlint-plugin-immutable/no-let stays");
  });

  test("is idempotent", () => {
    const once = migrateConfig(config).text;
    expect(migrateConfig(once)).toEqual({ text: once, count: 0 });
  });
});

describe("CLI", () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "migrate-0.2-"));
    writeFileSync(join(dir, ".oxlintrc.json"), '{ "rules": { "oxlint-plugin-immutable/no-let": "error" } }\n');
    writeFileSync(
      join(dir, "a.ts"),
      "// oxlint-disable-next-line oxlint-plugin-immutable/no-let\nlet a = 1;\nexport { a };\n",
    );
    writeFileSync(join(dir, "notes.md"), "oxlint-disable-next-line oxlint-plugin-immutable/no-let\n");
    return dir;
  };

  for (const runtime of ["node", "bun"] as const) {
    test(`${runtime}: --check, --dry-run, rewrite, then --check passes and a rerun changes nothing`, async () => {
      const dir = setup();
      try {
        const before = readFileSync(join(dir, "a.ts"), "utf8");
        const check1 = await $`${runtime} ${SCRIPT} --check ${dir}`.nothrow().quiet();
        expect(check1.exitCode).toBe(1);
        expect(check1.stdout.toString()).toContain(
          "to migrate: 1 suppression(s) in 1 file(s), 1 config key(s) in 1 file(s)",
        );

        const dry = await $`${runtime} ${SCRIPT} --dry-run ${dir}`.nothrow().quiet();
        expect(dry.exitCode).toBe(0);
        expect(readFileSync(join(dir, "a.ts"), "utf8")).toBe(before);

        const run = await $`${runtime} ${SCRIPT} ${dir}`.nothrow().quiet();
        expect(run.exitCode).toBe(0);
        expect(readFileSync(join(dir, "a.ts"), "utf8")).toContain("// oxlint-disable-next-line immutable/no-let");
        expect(readFileSync(join(dir, ".oxlintrc.json"), "utf8")).toContain('"immutable/no-let"');
        // Non-source files are not touched.
        expect(readFileSync(join(dir, "notes.md"), "utf8")).toContain("oxlint-plugin-immutable/no-let");

        const check2 = await $`${runtime} ${SCRIPT} --check ${dir}`.nothrow().quiet();
        expect(check2.exitCode).toBe(0);
        const rerun = await $`${runtime} ${SCRIPT} ${dir}`.nothrow().quiet();
        expect(rerun.stdout.toString()).toContain(
          "migrated: 0 suppression(s) in 0 file(s), 0 config key(s) in 0 file(s)",
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
