import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-061: the imports move fix (version 1, the default) never builds `import type { type X }`
// (TS2206). A type-only declaration's specifier merged into a value import keeps upstream 0.14.5's
// output, `import { createSignal, Component }`, which the vendored upstream imports test asserts.
const rule = ruleOf(plugin, "imports");
const tester = ruleTester("tsx");

tester.run("imports: type specifiers in the move fix", rule, {
  valid: [],
  invalid: [
    // An inline type specifier moves as an inline type specifier.
    {
      code: `import { type JSX, render } from "solid-js/web";`,
      output: `import { type JSX } from "solid-js";\nimport {  render } from "solid-js/web";`,
      errors: [{ messageId: "prefer-source" }],
    },
    // An inline type specifier merged into a type-only declaration drops its now-redundant modifier.
    {
      code: `import type { Component } from "solid-js";\nimport { type JSX, render } from "solid-js/web";`,
      output: `import type { Component, JSX } from "solid-js";\nimport {  render } from "solid-js/web";`,
      errors: [{ messageId: "prefer-source" }],
    },
  ],
});
