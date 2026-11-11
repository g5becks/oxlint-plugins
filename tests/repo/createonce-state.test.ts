import { describe, expect, test } from "bun:test";
import { checkFile } from "../../scripts/check-createonce-state.ts";

const rule = (body: string, before = "") => `export default {
  createOnce(context: any) {
${body}
    return {
      ${before ? `before() {\n${before}\n      },` : ""}
      Program() {},
    };
  },
};
`;

const statuses = (src: string) => checkFile("/virtual/rule.ts", src).map((f) => `${f.name}:${f.status}`);

describe("check-createonce-state", () => {
  test("flags closure state that before() does not reset", () => {
    expect(statuses(rule("    const seen = new Set<string>();\n    let count = 0;"))).toEqual([
      "seen:NOT RESET",
      "count:NOT RESET",
    ]);
  });

  test("accepts every supported reset form", () => {
    const src = rule(
      "    const a = new Set();\n    let b = 0;\n    const c: string[] = [];\n    const d = makeTracker();\n    const e: Record<string, string> = {};",
      "        a.clear();\n        b = 0;\n        c.length = 0;\n        d.reset();\n        for (const k of Object.keys(e)) delete e[k];",
    );
    expect(statuses(src)).toEqual(["a:reset", "b:reset", "c:reset", "d:reset", "e:reset"]);
  });

  test("allowlists with a justification comment and ignores functions and primitives", () => {
    const src = rule(
      '    // createonce-state: immutable (lookup table)\n    const TABLE = new Set(["a"]);\n    const MAX = 3;\n    const helper = () => MAX;',
    );
    expect(statuses(src)).toEqual(["TABLE:allowlisted"]);
  });

  test("a planted violation in a real rule is caught (reset removed)", async () => {
    const real = await Bun.file(new URL("../../packages/solidjs/src/rules/jsx-no-undef.ts", import.meta.url)).text();
    expect(checkFile("jsx-no-undef.ts", real).every((f) => f.status !== "NOT RESET")).toBe(true);
    const planted = real.replace("missingComponentsSet.clear();", "");
    expect(checkFile("jsx-no-undef.ts", planted).map((f) => `${f.name}:${f.status}`)).toContain(
      "missingComponentsSet:NOT RESET",
    );
  });
});
