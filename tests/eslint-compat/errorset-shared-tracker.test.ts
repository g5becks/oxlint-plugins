/**
 * TASK-032 (audit R6): all errorset rules share one import tracker per file under ESLint
 * (eslintCompatPlugin runs every rule's before() before the traversal and every after() before
 * the next file). Counts come from the tracker's stats; the expected numbers from the parsed AST.
 */
import { describe, expect, test } from "bun:test";
import tsParser from "@typescript-eslint/parser";
import { Linter } from "../helpers/eslint.ts";
import errorset from "../../packages/errorset/src/index.ts";
import { trackerStats } from "../../packages/errorset/src/utils/shared-tracker.ts";

const RULES = Object.keys((errorset as { rules: Record<string, unknown> }).rules);
const config = [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tsParser },
    plugins: { errorset: errorset as never },
    rules: Object.fromEntries(RULES.map((r) => [`errorset/${r}`, "error" as const])),
  },
];

const WITH_ERRORSET = `import { errorSet, isErr } from "@takinprofit/errorset";
import { readFile } from "node:fs/promises";
const UserError = errorSet("UserError", ["not_found"]).init();
let counter = 0;
export function load(id: string) {
  const data = readFile(id);
  if (!data) throw UserError.not_found\`missing \${id}\`;
  return data;
}
export function check(r: unknown) {
  return isErr(r) ? r.data : null;
}
`;
const WITHOUT_ERRORSET = `import { readFile } from "node:fs/promises";
const a = 1;
export const b = () => readFile(String(a));
`;

/** ImportDeclaration + VariableDeclaration nodes in the file (what a tracker processes). */
function declarationCount(code: string): number {
  const { ast } = tsParser.parseForESLint(code, { range: true });
  let count = 0;
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "ImportDeclaration" || n.type === "VariableDeclaration") count++;
    for (const [k, v] of Object.entries(n)) {
      if (k === "parent") continue;
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === "object" && typeof (v as { type?: unknown }).type === "string") visit(v);
    }
  };
  visit(ast);
  return count;
}

function lint(code: string, filename = "file.ts") {
  return new Linter({ configType: "flat" })
    .verify(code, config, filename)
    .map((m) => `${m.line}:${m.ruleId}`)
    .sort();
}

describe("errorset: one shared import tracker per file (ESLint)", () => {
  test(`all ${RULES.length} rules share one tracker and process each declaration once`, () => {
    const before = trackerStats();
    const messages = lint(WITH_ERRORSET);
    const after = trackerStats();
    expect(messages.length).toBeGreaterThan(0); // the rules ran and reported
    expect(after.trackersCreated - before.trackersCreated).toBe(1);
    const declarations = declarationCount(WITH_ERRORSET);
    expect(declarations).toBe(5);
    // Unshared, each rule would process every declaration (RULES.length times as many).
    expect(after.nodesProcessed - before.nodesProcessed).toBe(declarations);
  });

  test("files without a configured module create no tracker", () => {
    const before = trackerStats();
    expect(lint(WITHOUT_ERRORSET)).toEqual([]);
    expect(trackerStats().trackersCreated).toBe(before.trackersCreated);
  });

  test("no state carries over between files", () => {
    const alone = lint(WITH_ERRORSET, "a.ts");
    // Interleave files with and without errorset; every run of the same file gives the same result.
    expect(lint(WITHOUT_ERRORSET, "b.ts")).toEqual([]);
    expect(lint(WITH_ERRORSET, "c.ts")).toEqual(alone);
    expect(lint(WITHOUT_ERRORSET, "d.ts")).toEqual([]);
    expect(lint(WITH_ERRORSET, "e.ts")).toEqual(alone);
  });
});
