import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-057: for-keyed-literal (settings.solidjs.version 2 only). MIGRATION §List rendering ("Prefer
// literal keyed modes for function children"); RFC 03 §List rendering notes.
const rule = ruleOf(plugin, "for-keyed-literal");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };
const I = `import { For, mapArray } from "solid-js";\n`;

tester.run("for-keyed-literal", rule, {
  valid: [
    `${I}const A = () => <For each={items()}>{(t) => <b>{t}</b>}</For>;`,
    `${I}const A = () => <For each={items()} keyed>{(t) => <b>{t}</b>}</For>;`,
    `${I}const A = () => <For each={items()} keyed={false}>{(t) => <b>{t()}</b>}</For>;`,
    `${I}const A = () => <For each={items()} keyed={(t) => t.id}>{(t) => <b>{t().name}</b>}</For>;`,
    `${I}const byId = (t) => t.id; const A = () => <For each={items()} keyed={byId}>{(t) => <b>{t()}</b>}</For>;`,
    `${I}const KEYED = false; const A = () => <For each={items()} keyed={KEYED}>{(t) => <b>{t()}</b>}</For>;`,
    // Identifiers and members of unknown type may be key functions.
    `${I}const A = (p) => <For each={items()} keyed={p.keyFn}>{(t) => <b>{t}</b>}</For>;`,
    // No function children: the callback shape doesn't matter.
    `${I}const A = () => <For each={items()} keyed={mode()}><b /></For>;`,
    `${I}const rows = mapArray(list, (r) => r, { keyed: false });`,
    // Not Solid's For.
    `import { For } from "other"; const A = () => <For keyed={mode()}>{(x) => x}</For>;`,
  ].map((code) => ({ code, settings })),
  invalid: [
    {
      code: `${I}const A = () => <For each={items()} keyed={byIndex()}>{(t) => <b>{t}</b>}</For>;`,
      errors: [{ messageId: "dynamicKeyed" }],
    },
    {
      code: `${I}const A = (p) => <For each={items()} keyed={!p.byIndex}>{(t) => <b>{t}</b>}</For>;`,
      errors: [{ messageId: "dynamicKeyed" }],
    },
    {
      code: `${I}const A = (p) => <For each={items()} keyed={p.mode === "id"}>{(t) => <b>{t}</b>}</For>;`,
      errors: [{ messageId: "dynamicKeyed" }],
    },
    {
      code: `${I}const A = (p) => <For each={items()} keyed={p.a && p.b}>{(t) => <b>{t}</b>}</For>;`,
      errors: [{ messageId: "dynamicKeyed" }],
    },
    {
      code: `${I}const A = (p) => <For each={items()} keyed={p.on ? true : false}>{(t) => <b>{t}</b>}</For>;`,
      errors: [{ messageId: "dynamicKeyed" }],
    },
    {
      code: `${I}const rows = mapArray(list, (r) => r, { keyed: byIndex() });`,
      errors: [{ messageId: "dynamicKeyed" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("for-keyed-literal (version 1)", rule, {
  valid: [`${I}const A = () => <For each={items()} keyed={byIndex()}>{(t) => <b>{t}</b>}</For>;`],
  invalid: [],
});
