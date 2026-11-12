import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-let");

const tester = ruleTester("tsx");
const generic = [{ messageId: "generic" }];

tester.run("no-let", rule, {
  valid: [
    "const x = 1;",
    { code: "for (let i = 0; i < 3; i++) {}", options: [{ allowInForLoopInit: true }] },
    { code: "for (let k in o) {}", options: [{ allowInForLoopInit: true }] },
    // allowInFunctions (eslint-plugin-functional 10.0.1): any `let` inside a function body.
    { code: "function f() { let x = 1; return x; }", options: [{ allowInFunctions: true }] },
    { code: "const f = () => { if (a) { let x = 1; } };", options: [{ allowInFunctions: true }] },
    { code: "const o = { m() { let x = 1; } };", options: [{ allowInFunctions: true }] },
    { code: "class C { m() { let x = 1; } }", options: [{ allowInFunctions: true }] },
    // ignoreIdentifierPattern: every named declarator must match.
    { code: "let mutableX = 1;", options: [{ ignoreIdentifierPattern: "^mutable" }] },
    { code: "let mutA = 1, mutB = 2;", options: [{ ignoreIdentifierPattern: "^mut" }] },
    { code: "let a = 1, mutB = 2;", options: [{ ignoreIdentifierPattern: ["^a$", "^mut"] }] },
    // Destructured declarators have no name; the named one decides (upstream behavior).
    { code: "let mutA = 1, { b } = o;", options: [{ ignoreIdentifierPattern: "^mut" }] },
  ],
  invalid: [
    { code: "let x = 1;", errors: generic },
    { code: "for (let i = 0; i < 3; i++) {}", errors: generic },
    { code: "let x = 1;", options: [{ allowInFunctions: true }], errors: generic },
    { code: "if (a) { let x = 1; }", options: [{ allowInFunctions: true }], errors: generic },
    { code: "class C { static { let x = 1; } }", options: [{ allowInFunctions: true }], errors: generic },
    { code: "function f() { let x = 1; }", options: [{ allowInFunctions: false }], errors: generic },
    { code: "let x = 1;", options: [{ ignoreIdentifierPattern: "^mutable" }], errors: generic },
    { code: "let mutA = 1, b = 2;", options: [{ ignoreIdentifierPattern: "^mut" }], errors: generic },
    { code: "let { mutA } = o;", options: [{ ignoreIdentifierPattern: "^mut" }], errors: generic },
    {
      code: "function f() { let x = 1; }",
      options: [{ allowInFunctions: false, ignoreIdentifierPattern: "^y" }],
      errors: generic,
    },
  ],
});
