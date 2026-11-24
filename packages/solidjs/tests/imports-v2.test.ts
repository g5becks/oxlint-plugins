import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-048: imports at settings.solidjs.version 2. Cases follow MIGRATION §Imports: where things live
// now, §Quick rename / removal map (Import paths) and RFC 09 (JSX types).
const rule = ruleOf(plugin, "imports");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("imports (version 2)", rule, {
  valid: [
    `import { createSignal, createStore, reconcile, snapshot, For, Loading } from "solid-js";\nimport { render, hydrate, dynamic, Portal } from "@solidjs/web";\nimport type { JSX } from "@solidjs/web";\nimport type { Component, Element } from "solid-js";`,
    // Names the 2.0 map doesn't know are left alone (removed APIs are no-removed-apis' job).
    `import { createResource, somethingNew } from "solid-js";\nimport { renderToStringAsync } from "@solidjs/web";`,
    // Ambiguous names exist in both packages with different meanings.
    `import type { ComponentProps, ValidComponent } from "@solidjs/web";\nimport type { ComponentProps as CP } from "solid-js";`,
    `import { batch } from "other-lib";`,
  ].map((code) => ({ code, settings })),
  invalid: [
    // ---- Import paths (autofix) ----
    {
      code: `import { render } from "solid-js/web";\nrender(() => null, document.body);`,
      output: `import { render } from "@solidjs/web";\nrender(() => null, document.body);`,
      errors: [{ messageId: "movedModule" }],
    },
    {
      code: `import { render, Portal } from 'solid-js/web';`,
      output: `import { render, Portal } from '@solidjs/web';`,
      errors: [{ messageId: "movedModule" }],
    },
    {
      code: `import { createStore, reconcile } from "solid-js/store";`,
      output: `import { createStore, reconcile } from "solid-js";`,
      errors: [{ messageId: "movedModule" }],
    },
    // Store APIs merge into an existing value import from solid-js.
    {
      code: `import { createSignal } from "solid-js";\nimport { createStore, reconcile } from "solid-js/store";\nconst x = 1;`,
      output: `import { createSignal, createStore, reconcile } from "solid-js";\nconst x = 1;`,
      errors: [{ messageId: "movedModule" }],
    },
    // A type-only import isn't merged into a value import.
    {
      code: `import { createSignal } from "solid-js";\nimport type { Store } from "solid-js/store";`,
      output: `import { createSignal } from "solid-js";\nimport type { Store } from "solid-js";`,
      errors: [{ messageId: "movedModule" }],
    },
    ...[
      ["solid-js/h", "@solidjs/h", `import h from "solid-js/h";`],
      ["solid-js/html", "@solidjs/html", `import html from "solid-js/html";`],
      ["solid-js/universal", "@solidjs/universal", `import { createRenderer } from "solid-js/universal";`],
      ["solid-js/jsx-runtime", "@solidjs/web/jsx-runtime", `import { jsx } from "solid-js/jsx-runtime";`],
    ].map(([from, to, code]) => ({
      code: code!,
      output: code!.replace(from!, to!),
      errors: [{ messageId: "movedModule" }],
    })),
    // ---- Names in the wrong 2.0 module (autofix moves the specifier) ----
    {
      code: `import { createSignal, render } from "solid-js";`,
      output: `import { render } from "@solidjs/web";\nimport { createSignal } from "solid-js";`,
      errors: [{ messageId: "prefer-source" }],
    },
    {
      code: `import { createStore } from "@solidjs/web";\nimport { createSignal } from "solid-js";`,
      output: `import { createSignal, createStore } from "solid-js";`,
      errors: [{ messageId: "prefer-source" }],
    },
    // RFC 09: the JSX namespace is the renderer's.
    {
      code: `import type { JSX } from "solid-js";`,
      output: `import type { JSX } from "@solidjs/web";`,
      errors: [{ messageId: "prefer-source" }],
    },
    // Flow components re-exported by @solidjs/web are preferred from solid-js (as in 1.x).
    {
      code: `import { Show } from "@solidjs/web";`,
      output: `import { Show } from "solid-js";`,
      errors: [{ messageId: "prefer-source" }],
    },
    // RFC 09 §Removals: JSXElement is gone.
    {
      code: `import type { JSXElement } from "solid-js";`,
      output: null,
      errors: [{ messageId: "removedType" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("imports (version 1 controls)", rule, {
  valid: [`import { render } from "solid-js/web";\nimport { createStore } from "solid-js/store";`],
  invalid: [],
});
