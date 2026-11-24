import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-055: reconcile-key (settings.solidjs.version 2 only). RFC 04 §reconcile(value, key?): the key
// defaults to "id"; null is positional; 2.0 takes the key as the second argument (merge is always on).
const rule = ruleOf(plugin, "reconcile-key");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };
const I = `import { reconcile } from "solid-js";\n`;

tester.run("reconcile-key", rule, {
  valid: [
    // RFC 04's 2.0 draft-setter form.
    `${I}setStore((s) => { reconcile(serverTodos, "id")(s.todos); });`,
    `${I}setStore((s) => { reconcile(next, "_id")(s); });`,
    `${I}setRows(reconcile(fresh, null));`,
    `${I}setRows(reconcile(fresh, (row) => row.uuid));`,
    `${I}const key = "_id"; setRows(reconcile(fresh, key));`,
    // Not Solid's reconcile.
    `import { reconcile } from "other"; reconcile(x);`,
  ].map((code) => ({ code, settings })),
  invalid: [
    {
      code: `${I}setArrayDraft(reconcile(next));`,
      output: null,
      errors: [
        {
          messageId: "missingKey",
          suggestions: [
            { messageId: "suggestId", output: `${I}setArrayDraft(reconcile(next, "id"));` },
            { messageId: "suggestPositional", output: `${I}setArrayDraft(reconcile(next, null));` },
          ],
        },
      ],
    },
    // The 1.x options object (autofix when the key is a literal and merge isn't false).
    {
      code: `${I}setStore("todos", reconcile(todos, { key: "_id" }));`,
      output: `${I}setStore("todos", reconcile(todos, "_id"));`,
      errors: [{ messageId: "optionsObject" }],
    },
    {
      code: `${I}setStore(reconcile(rows, { key: null, merge: true }));`,
      output: `${I}setStore(reconcile(rows, null));`,
      errors: [{ messageId: "optionsObject" }],
    },
    {
      code: `import { reconcile } from "solid-js/store";\nsetStore(reconcile(rows, { key: "id" }));`,
      output: `import { reconcile } from "solid-js/store";\nsetStore(reconcile(rows, "id"));`,
      errors: [{ messageId: "optionsObject" }],
    },
    // merge: false has no 2.0 equivalent.
    {
      code: `${I}setStore(reconcile(rows, { key: "id", merge: false }));`,
      output: null,
      errors: [{ messageId: "mergeFalse" }],
    },
    // An options object without a key is the default "id".
    {
      code: `${I}setStore(reconcile(rows, { merge: true }));`,
      output: null,
      errors: [
        {
          messageId: "missingKey",
          suggestions: [
            { messageId: "suggestId", output: `${I}setStore(reconcile(rows, "id"));` },
            { messageId: "suggestPositional", output: `${I}setStore(reconcile(rows, null));` },
          ],
        },
      ],
    },
    // A non-literal options object: report only.
    {
      code: `${I}setStore(reconcile(rows, opts));\nconst opts = { key: "id" };`,
      output: null,
      errors: [{ messageId: "optionsObject" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("reconcile-key (version 1)", rule, {
  valid: [`import { reconcile } from "solid-js/store"; setStore(reconcile(next));`],
  invalid: [],
});
