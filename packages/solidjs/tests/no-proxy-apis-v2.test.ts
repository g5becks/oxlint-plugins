import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-054: no-proxy-apis at settings.solidjs.version 2. In @solidjs/signals 2.0.3, merge() and omit()
// build a Proxy view only when Proxy exists and fall back to copying otherwise (SUPPORTS_PROXY);
// a function source passed to merge becomes a memo, which the copy can't read. Stores always use a
// Proxy. MIGRATION §Imports (stores are exported from solid-js); RFC 04 §merge, §omit.
const rule = ruleOf(plugin, "no-proxy-apis");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("no-proxy-apis (version 2)", rule, {
  valid: [
    // omit falls back to a plain copy without Proxy.
    `import { omit } from "solid-js"; const A = (props) => { const rest = omit(props, "a"); return <div />; };`,
    `import { merge } from "solid-js"; const A = (props) => { const m = merge({ a: 1 }, props); return <div />; };`,
    `import { reconcile, snapshot } from "solid-js"; void reconcile; void snapshot;`,
  ].map((code) => ({ code, settings })),
  invalid: [
    { code: `import { createStore } from "solid-js";`, errors: [{ messageId: "noStoreV2" }] },
    {
      code: `import { createSignal, createProjection, createOptimisticStore } from "solid-js";`,
      errors: [{ messageId: "noStoreV2" }, { messageId: "noStoreV2" }],
    },
    { code: `import { createStore } from "solid-js/store";`, errors: [{ messageId: "noStore" }] },
    {
      code: `import { merge } from "solid-js"; const m = merge(() => ({ a: 1 }), {});`,
      errors: [{ messageId: "mergeV2" }],
    },
    {
      code: `import { merge } from "solid-js"; const A = (p) => { const m = merge({}, source); return <div />; };`,
      errors: [{ messageId: "mergeV2" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("no-proxy-apis (version 1 controls)", rule, {
  valid: [`import { createStore, merge } from "solid-js"; merge(() => ({}));`],
  invalid: [],
});
