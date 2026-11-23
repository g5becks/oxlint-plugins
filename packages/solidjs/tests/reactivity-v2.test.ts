import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-044: reactivity at settings.solidjs.version 2 (the Solid 2.0 model). Cases follow the
// before/after examples of the Solid 2.0 MIGRATION guide and RFCs 01, 03, 04, 05, 07 and 08
// (solidjs/solid documentation/solid-2.0 at cd201ce); each case names its section.
const rule = ruleOf(plugin, "reactivity");
const tester = ruleTester("tsx");
const v2 = { solidjs: { version: 2 } };

const S = `import { createSignal, createMemo, createEffect, createRenderEffect, createTrackedEffect, createStore,
  createProjection, createOptimistic, createOptimisticStore, onSettled, isPending, latest, action, untrack,
  merge, omit, For, Repeat, Show, Match, createContext, flush, resolve } from "solid-js";\n`;

type Case = { code: string; errors?: Array<{ messageId: string }> };
const at2 = <T extends Case>(c: T) => ({ ...c, code: S + c.code, settings: v2 });

tester.run("reactivity (version 2)", rule, {
  valid: [
    // MIGRATION §Effects, lifecycle, and cleanup: split effect, compute tracked, apply receives the value.
    {
      code: `function App() { const [name] = createSignal(""); createEffect(() => name(), (v) => { document.title = v; }); return <div />; }`,
    },
    // MIGRATION §on helper → split effects: an accessor as the compute.
    {
      code: `function App() { const [count] = createSignal(0); createEffect(count, (v) => { console.log(v); }); return <div />; }`,
    },
    // RFC 01 §createEffect error handling: EffectBundle.
    {
      code: `function App() { const [id] = createSignal(1); createEffect(() => load(id()), { effect: (d) => { show(d); }, error: (e) => { log(e); } }); return <div />; }`,
    },
    // RFC 01 §createRenderEffect.
    {
      code: `function T(props) { let el; createRenderEffect(() => props.title, (value) => { el.title = value; }); return <div ref={el} />; }`,
    },
    // RFC 05: async computations are allowed in 2.0 (no noAsyncTrackedScope).
    {
      code: `function App() { const [id] = createSignal(1); const user = createMemo(async () => { const i = id(); const r = await fetch("/u/" + i); return r.json(); }); return <div>{user()}</div>; }`,
    },
    {
      code: `function App() { const [id] = createSignal(1); createEffect(async () => fetch("/u/" + id()), (d) => { show(d); }); return <div />; }`,
    },
    // RFC 08 §UNTRACKED_READ_AFTER_AWAIT: the fix (read before the first await) and a read inside the awaited expression.
    {
      code: `function App() { const [query] = createSignal(""); const items = createMemo(async () => { const q = query(); const res = await fetchItems(); return res.filter((item) => item.tag === q); }); return <div>{items()}</div>; }`,
    },
    {
      code: `function App() { const [q] = createSignal(""); const r = createMemo(async () => (await fetch("/s?q=" + q())).json()); return <div>{r()}</div>; }`,
    },
    // A source also read before the await does not warn.
    {
      code: `function App() { const [q] = createSignal(""); const r = createMemo(async () => { q(); await tick(); return q(); }); return <div>{r()}</div>; }`,
    },
    // untrack after an await is explicit.
    {
      code: `function App() { const [q] = createSignal(""); const r = createMemo(async () => { await tick(); return untrack(() => q()); }); return <div>{r()}</div>; }`,
    },
    // Async generators are not checked (RFC 08: not covered).
    {
      code: `function App() { const [q] = createSignal(""); const v = createMemo(async function* () { for await (const x of src) { yield x + q(); } }); return <div>{v()}</div>; }`,
    },
    // MIGRATION §New function forms: createSignal(fn) / createStore(fn).
    {
      code: `function App() { const [count] = createSignal(0); const [doubled] = createSignal(() => count() * 2); return <div>{doubled()}</div>; }`,
    },
    {
      code: `function App() { const [items] = createStore({ list: [] }); const [cache] = createStore((draft) => { draft.total = items.list.length; }, { total: 0 }); return <div>{cache.total}</div>; }`,
    },
    // RFC 04 §Derived stores: createProjection derive is tracked; the result is a store.
    {
      code: `function App() { const [sel] = createSignal("a"); const selected = createProjection((s) => { s[sel()] = true; }, {}); return <div>{selected.a}</div>; }`,
    },
    {
      code: `function App() { const [o, setO] = createOptimistic(0); const [t] = createOptimisticStore({ list: [] }); return <div>{o()}{t.list.length}</div>; }`,
    },
    // solid-js 2.0.3 onSettled: reads are allowed (and not tracked).
    {
      code: `function App() { const [count] = createSignal(0); onSettled(() => { const v = count(); log(v); }); return <div />; }`,
    },
    // MIGRATION §Initial loading vs in-flight changes / §Peeking in-flight values: in a derived function or JSX.
    {
      code: `function App() { const [users] = createSignal([]); const listPending = () => isPending(() => users()); return <Show when={listPending()}>x</Show>; }`,
    },
    {
      code: `function App() { const [users] = createSignal([]); return <Show when={isPending(() => users())}>x</Show>; }`,
    },
    {
      code: `function App() { const [id] = createSignal(1); const latestId = () => latest(id); return <div>{latestId()}</div>; }`,
    },
    // RFC 06: action bodies are imperative.
    {
      code: `function App() { const [count] = createSignal(0); const save = action(function* () { yield api.save(count()); }); return <button onClick={() => save()} />; }`,
    },
    // MIGRATION §Ref callbacks / RFC 07 §Directives via ref: ref callbacks, including arrays.
    {
      code: `function App() { const [name] = createSignal(""); return <div ref={(el) => { el.title = name(); }} />; }`,
    },
    {
      code: `function App() { const [name] = createSignal(""); return <div ref={[(el) => { el.title = name(); }, autofocus]} />; }`,
    },
    // RFC 03 §List rendering: For keyed={false} gives an item accessor and a plain index.
    {
      code: `function App() { const [items] = createSignal([]); return <For each={items()} keyed={false}>{(item, i) => <div>{item()}{i}</div>}</For>; }`,
    },
    // Default For: raw item, index accessor (as 1.x).
    {
      code: `function App() { const [todos] = createSignal([]); return <For each={todos()}>{(todo, i) => <div>{todo.title}{i()}</div>}</For>; }`,
    },
    // RFC 03 §Range/count rendering: Repeat passes a plain number.
    { code: `function App() { return <Repeat count={10}>{(i) => <div>{i}</div>}</Repeat>; }` },
    // RFC 03 §Conditionals: non-keyed Show passes an accessor; keyed passes the raw value.
    {
      code: `function App() { const [user] = createSignal(null); return <Show when={user()}>{(u) => <span>{u().name}</span>}</Show>; }`,
    },
    {
      code: `function App() { const [user] = createSignal(null); return <Show when={user()} keyed>{(u) => <span>{u.name}</span>}</Show>; }`,
    },
    // MIGRATION §Attributes & events: a lowercase on* is an attribute, so a reactive expression is fine.
    { code: `function App() { const [count] = createSignal(0); return <div onclick={String(count())} />; }` },
    // RFC 04 §merge / §omit: the results are props-like.
    {
      code: `function Btn(props) { const merged = merge({ size: "m" }, props); const rest = omit(props, "class"); return <div class={merged.size} {...rest} />; }`,
    },
    // RFC 01 §flush: flush(fn) runs its callback in place.
    {
      code: `function App() { const [a, setA] = createSignal(0); return <button onClick={() => flush(() => { setA(a() + 1); })} />; }`,
    },
    // 1.x APIs still used in a version-2 file keep their 1.x treatment: no-removed-apis reports
    // them, reactivity adds no noise (agentx charts.tsx shape).
    {
      code: `import { on, onMount, createResource } from "solid-js"; function Chart(props) { const [chart] = createSignal(null); onMount(() => init()); createEffect(on(() => props.data, () => { chart().data = props.data; }, { defer: true })); const [r] = createResource(() => props.id, load); return <div>{r()}</div>; }`,
    },
    // MIGRATION §New in 2.0: resolve(fn) tracks its expression.
    {
      code: `function App() { const [v] = createSignal(0); const go = async () => { await resolve(() => v()); }; return <button onClick={go} />; }`,
    },
  ].map(at2),
  invalid: [
    // RFC 08 §STRICT_READ_UNTRACKED, RFC 01 §Stores in the compute phase: a read in the apply half.
    {
      code: `function App() { const [id] = createSignal(1); const [name] = createSignal(""); createEffect(() => id(), (v) => { log(v, name()); }); return <div />; }`,
      errors: [{ messageId: "readInApply" }],
    },
    {
      code: `function Card(props) { createEffect(() => props.id, (v) => { log(v, props.name); }); return <div />; }`,
      errors: [{ messageId: "readInApply" }],
    },
    {
      code: `function App() { const [id] = createSignal(1); const [n] = createSignal(0); createEffect(() => id(), { effect: (v) => { log(n()); } }); return <div />; }`,
      errors: [{ messageId: "readInApply" }],
    },
    // RFC 08 §UNTRACKED_READ_AFTER_AWAIT: the guide's example.
    {
      code: `function App() { const [query] = createSignal(""); const items = createMemo(async () => { const res = await fetchItems(); return res.filter((item) => item.tag === query()); }); return <div>{items()}</div>; }`,
      errors: [{ messageId: "readAfterAwait" }],
    },
    {
      code: `function C(props) { const user = createMemo(async () => { const t = await token(); return load(t, props.id); }); return <div>{user()}</div>; }`,
      errors: [{ messageId: "readAfterAwait" }],
    },
    // for await: the loop body runs after an await.
    {
      code: `function App() { const [q] = createSignal(""); const r = createMemo(async () => { const out = []; for await (const x of src) out.push(x + q()); return out; }); return <div>{r()}</div>; }`,
      errors: [{ messageId: "readAfterAwait" }],
    },
    // isPending/latest evaluate their function where they're called: a top-level call is untracked.
    {
      code: `function App() { const [users] = createSignal([]); const p = isPending(() => users()); return <div>{String(p)}</div>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `function App() { const [id] = createSignal(1); const l = latest(id); return <div>{l}</div>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    // RFC 01 §Strict top-level access: reads in a control-flow callback body.
    {
      code: `function App() { const [user] = createSignal(null); return <Show when={user()}>{(u) => { const name = u().name; return <span>{name}</span>; }}</Show>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `function App() { const [items] = createSignal([]); const [count] = createSignal(0); return <For each={items()}>{(item) => { const c = count(); return <div>{item}{c}</div>; }}</For>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    // For keyed={false}: the item is an accessor.
    {
      code: `function App() { const [items] = createSignal([]); return <For each={items()} keyed={false}>{(item) => <div>{item}</div>}</For>; }`,
      errors: [{ messageId: "badSignal" }],
    },
    // createTrackedEffect can't be async (RFC 08 §PENDING_ASYNC_FORBIDDEN_SCOPE).
    {
      code: `function App() { createTrackedEffect(async () => { await tick(); }); return <div />; }`,
      errors: [{ messageId: "noAsyncTrackedScope" }],
    },
    // 2.0 primitives as reactive sources.
    {
      code: `function App() { const [o] = createOptimistic(0); const v = o(); return <div>{v}</div>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `function App() { const [sel] = createSignal("a"); const selected = createProjection((s) => { s[sel()] = true; }, {}); const a = selected.a; return <div>{a}</div>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `function Btn(props) { const merged = merge({ size: "m" }, props); const size = merged.size; return <div class={size} />; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    // A camelCase handler expression is bound once (RFC 08 §STRICT_READ_UNTRACKED, event handler expressions).
    {
      code: `function App() { const [sel] = createSignal(false); return <button onClick={sel() ? save : cancel} />; }`,
      errors: [{ messageId: "expectedFunctionGotExpression" }],
    },
    // MIGRATION §Context providers + solid-js 2.0.3 createContext: the provider reads value once.
    {
      code: `const Theme = createContext("light"); function App() { const [t] = createSignal("dark"); return <Theme value={t()}><div /></Theme>; }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
  ].map(at2),
});

// Version 1 is unchanged: the 2.0-only reports above don't appear without the setting.
tester.run("reactivity (version 1 controls)", rule, {
  valid: [
    `import { createSignal, Show } from "solid-js"; function App() { const [user] = createSignal(null); return <Show when={user()}>{(u) => { const name = u.name; return <span>{name}</span>; }}</Show>; }`,
    `import { createSignal, createEffect } from "solid-js"; function App() { const [n] = createSignal(0); createEffect(() => { console.log(n()); }); return <div />; }`,
  ],
  invalid: [
    {
      code: `import { createSignal, createMemo } from "solid-js"; function App() { const [id] = createSignal(1); const u = createMemo(async () => id()); return <div>{u()}</div>; }`,
      errors: [{ messageId: "noAsyncTrackedScope" }],
    },
    {
      code: `import { createSignal } from "solid-js"; function App() { const [count] = createSignal(0); return <div onclick={String(count())} />; }`,
      errors: [{ messageId: "expectedFunctionGotExpression" }],
    },
  ],
});
