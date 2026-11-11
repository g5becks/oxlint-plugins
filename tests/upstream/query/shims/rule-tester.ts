// @typescript-eslint/rule-tester stand-in: runs the vendored upstream cases against OUR port of
// the rule (looked up by name in packages/query) in oxlint's RuleTester, in ESLint-compat mode.
// Cases listed in tests/upstream/query/parity.ts are skipped with a reason citing PARITY.md.
import { it } from "node:test";
import plugin from "../../../../packages/query/src/index.ts";
import { RuleTester as OxlintRuleTester } from "../../../helpers/rule-tester.ts";
import { skipReason } from "../parity.ts";

interface Case {
  name?: string;
  code: string;
  [key: string]: unknown;
}

export class RuleTester {
  static afterAll: unknown;
  static describe: unknown;
  static it: unknown;
  static itOnly: unknown;

  readonly config: unknown;
  constructor(config: unknown = {}) {
    this.config = config;
  }

  run(name: string, _upstreamRule: unknown, tests: { valid: Array<Case | string>; invalid: Case[] }) {
    const port = (plugin as unknown as { rules: Record<string, unknown> }).rules[name];
    const tester = new OxlintRuleTester({
      eslintCompat: true,
      languageOptions: { sourceType: "module", parserOptions: { lang: "tsx" } },
    });
    const keep = <T extends Case | string>(kind: "valid" | "invalid", cases: T[]) =>
      cases.filter((c, index) => {
        const caseName = typeof c === "string" ? undefined : c.name;
        const code = typeof c === "string" ? c : c.code;
        const reason = skipReason(name, kind, index, caseName, code);
        if (reason) it(`${name} ${kind}[${index}] ${caseName ?? ""}`.trim(), { skip: reason }, () => {});
        return !reason;
      });
    if (!port) {
      it(`${name}: no port`, { skip: skipReason(name, "suite", -1, undefined, "") ?? "no port" }, () => {});
      return;
    }
    // Upstream-only keys the oxlint RuleTester doesn't know.
    const clean = <T extends Case | string>(c: T): T => {
      if (typeof c === "string") return c;
      const { languageOptions: _l, ...rest } = c as Case & { languageOptions?: unknown };
      return rest as T;
    };
    tester.run(name, port as never, {
      valid: keep("valid", tests.valid).map(clean),
      invalid: keep("invalid", tests.invalid).map(clean) as never,
    });
  }
}
