// eslint-plugin-solid's test/ruleTester.ts stand-in: `run(name, rule, tests)` runs the upstream
// cases against OUR port of `name` (packages/solidjs) in oxlint's RuleTester (ESLint-compat mode,
// TSX, so `tsOnly` cases run too). Cases listed in parity.ts are skipped with a PARITY.md reason.
import { it } from "node:test";
import plugin from "../../../packages/solidjs/src/index.ts";
import { RuleTester } from "../../helpers/rule-tester.ts";
import { skipReason } from "./parity.ts";

export const tsOnly = Symbol("ts only");

interface Case {
  name?: string;
  code: string;
  [key: string]: unknown;
}
interface Tests {
  valid?: Array<Case | string>;
  invalid?: Case[];
}

export const run = (name: string, _upstreamRule: unknown, tests: Tests): Tests => {
  const port = (plugin as unknown as { rules: Record<string, unknown> }).rules[name];
  const keep = <T extends Case | string>(kind: "valid" | "invalid", cases: T[] = []) =>
    cases.filter((c, index) => {
      const code = typeof c === "string" ? c : c.code;
      const reason = skipReason(name, kind, index, code);
      if (reason) it(`${name} ${kind}[${index}]`, { skip: reason }, () => {});
      return !reason;
    });
  const tester = new RuleTester({
    eslintCompat: true,
    languageOptions: { sourceType: "module", parserOptions: { lang: "tsx" } },
  });
  tester.run(name, port as never, {
    valid: keep("valid", tests.valid),
    invalid: keep("invalid", tests.invalid) as never,
  });
  return tests;
};
