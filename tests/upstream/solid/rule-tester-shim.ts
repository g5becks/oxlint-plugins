// eslint-plugin-solid's test/ruleTester.ts stand-in: `run(name, rule, tests)` runs the upstream
// cases against OUR port of `name` (packages/solidjs) in oxlint's RuleTester (ESLint-compat mode,
// TSX, so `tsOnly` cases run too). Cases listed in parity.ts are skipped with a PARITY.md reason, or
// run against the port's expected output (TASK-062).
import { it } from "node:test";
import plugin from "../../../packages/solidjs/src/index.ts";
import { RuleTester } from "../../helpers/rule-tester.ts";
import { applyDivergences } from "./parity.ts";

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
  const keep = <T extends Case | string>(kind: "valid" | "invalid", cases: T[] = []) => {
    const { kept, skipped } = applyDivergences(name, kind, cases);
    for (const { index, reason } of skipped) it(`${name} ${kind}[${index}]`, { skip: reason }, () => {});
    return kept;
  };
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
