import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-047: no-write-in-reactive-scope (settings.solidjs.version 2 only), the static form of
// REACTIVE_WRITE_IN_OWNED_SCOPE. Cases follow RFC 01 §No writes under owned scope, RFC 08 and
// MIGRATION §"Write inside reactive scope" / §createComputed.
const rule = ruleOf(plugin, "no-write-in-reactive-scope");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };
const I = `import { createSignal, createStore, createMemo, createEffect, createProjection, createOptimistic, untrack, onSettled, action, refresh } from "solid-js";\n`;

tester.run("no-write-in-reactive-scope", rule, {
  valid: [
    // MIGRATION: derive instead of writing back.
    `const [count] = createSignal(0); const doubled = createMemo(() => count() * 2);`,
    // Writes in event handlers, onSettled, effect apply, timers and actions are fine.
    `function C() { const [n, setN] = createSignal(0); return <button onClick={() => setN((c) => c + 1)}>{n()}</button>; }`,
    `function C() { const [n, setN] = createSignal(0); onSettled(() => { setN(1); }); return <p>{n()}</p>; }`,
    `function C() { const [a] = createSignal(0); const [b, setB] = createSignal(0); createEffect(() => a(), (v) => { setB(v); }); return <p>{b()}</p>; }`,
    `function C() { const [n, setN] = createSignal(0); setTimeout(() => setN(1), 10); return <p>{n()}</p>; }`,
    `function C() { const [n, setN] = createSignal(0); const save = action(function* () { setN(1); yield 1; }); return <button onClick={() => save()} />; }`,
    // RFC 01: ownedWrite: true opts a signal in.
    `function C() { const [ref, setRef] = createSignal(null, { ownedWrite: true }); setRef(1); return <p>{ref()}</p>; }`,
    // Module level isn't owned; neither are plain helpers.
    `const [n, setN] = createSignal(0); setN(1);`,
    `const [n, setN] = createSignal(0); function helper() { setN(1); }`,
    // A projection's draft parameter isn't a setter (RFC 04 §Derived stores).
    `function C() { const [id] = createSignal("a"); const sel = createProjection((s) => { s[id()] = true; }, {}); return <p>{sel.a}</p>; }`,
    // MIGRATION §createComputed: the writable derived signal.
    `function C(props) { const [value, setValue] = createSignal(() => props.initial); return <input value={value()} onInput={(e) => setValue(e.currentTarget.value)} />; }`,
    // refresh from an event handler.
    `function C() { const user = createMemo(() => load()); return <button onClick={() => refresh(user)} />; }`,
    // Not Solid's createSignal.
    `import { createSignal as cs } from "other"; function C() { const [a, setA] = cs(0); setA(1); return <p />; }`,
  ].map((c) => ({ code: (c.startsWith("import") ? "" : I) + c, settings })),
  invalid: [
    // RFC 08 §REACTIVE_WRITE_IN_OWNED_SCOPE: in a memo.
    {
      code: `const [count] = createSignal(0); const [d, setDoubled] = createSignal(0); createMemo(() => setDoubled(count() * 2));`,
      errors: [{ messageId: "writeInScope" }],
    },
    // RFC 01: untrack doesn't exempt the write.
    {
      code: `function C() { const [n, setN] = createSignal(0); untrack(() => setN(1)); return <p>{n()}</p>; }`,
      errors: [{ messageId: "writeInScope" }],
    },
    // A component body.
    {
      code: `function Counter() { const [n, setN] = createSignal(0); setN(1); return <p>{n()}</p>; }`,
      errors: [{ messageId: "writeInScope" }],
    },
    {
      code: `const Counter = (props) => { const [n, setN] = createStore({ v: 0 }); setN((s) => { s.v = props.start; }); return <p>{n.v}</p>; };`,
      errors: [{ messageId: "writeInScope" }],
    },
    // An effect compute.
    {
      code: `const [a] = createSignal(0); const [b, setB] = createSignal(0); createEffect(() => { setB(a()); return a(); }, (v) => {});`,
      errors: [{ messageId: "writeInScope" }],
    },
    // A 1.x single-function effect copying a prop into state (agentx GeneralPage.tsx shape).
    {
      code: `function Page(props) { const [port, setPort] = createSignal(""); createEffect(() => { const d = props.data; if (!d) return; setPort(String(d.port)); }); return <input value={port()} />; }`,
      errors: [{ messageId: "writeInLegacyEffect" }],
    },
    // A derived signal / store.
    {
      code: `const [a] = createSignal(0); const [b, setB] = createSignal(0); const [c] = createSignal(() => { setB(1); return a(); });`,
      errors: [{ messageId: "writeInScope" }],
    },
    // Array iteration callbacks run in place.
    {
      code: `const [items] = createSignal([]); const [t, setT] = createSignal(0); createMemo(() => { items().forEach((i) => setT(i)); });`,
      errors: [{ messageId: "writeInScope" }],
    },
    // createOptimistic setters too.
    {
      code: `function C() { const [o, setO] = createOptimistic(0); setO(1); return <p>{o()}</p>; }`,
      errors: [{ messageId: "writeInScope" }],
    },
    // RFC 08: refresh() in owned scope.
    {
      code: `const user = createMemo(() => load()); const other = createMemo(() => refresh(user));`,
      errors: [{ messageId: "refreshInScope" }],
    },
  ].map((c) => ({ ...c, code: I + c.code, settings })),
});

tester.run("no-write-in-reactive-scope (version 1)", rule, {
  valid: [`${I}function Counter() { const [n, setN] = createSignal(0); setN(1); return <p>{n()}</p>; }`],
  invalid: [],
});
