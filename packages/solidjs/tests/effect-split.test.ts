import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-046: effect-split (settings.solidjs.version 2 only). Cases follow the Solid 2.0 MIGRATION
// guide (§Effects, lifecycle, and cleanup; §on helper → split effects) and RFC 01 / RFC 08.
const rule = ruleOf(plugin, "effect-split");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };
const I = `import { createEffect, createRenderEffect, createTrackedEffect, createMemo, createSignal, onSettled, onCleanup } from "solid-js";\n`;

type Invalid = { code: string; output?: string | null; errors: Array<{ messageId: string }> };
const at2 = (c: Invalid) => ({
  output: null,
  ...c,
  code: I + c.code,
  ...(c.output ? { output: I + c.output } : {}),
  settings,
});

tester.run("effect-split", rule, {
  valid: [
    // MIGRATION §Effects: split effect, cleanup returned from apply.
    `createEffect(() => name(), (value) => { el().title = value; });`,
    `createEffect(() => name(), (value) => { const id = setInterval(() => log(value), 1000); return () => clearInterval(id); });`,
    `createEffect((prev = 0) => count(), (value, prev) => { log(prev, value); });`,
    // MIGRATION §on helper → split effects: an accessor as compute, and options.
    `createEffect(count, (value) => { log(value); }, { defer: true });`,
    `createEffect(() => [a(), b()], ([a, b]) => log(a, b));`,
    // RFC 01 §createEffect error handling: EffectBundle.
    `createEffect(() => load(id()), { effect: (d) => { show(d); }, error: (e, cleanup) => { cleanup(); } });`,
    // RFC 01 §createRenderEffect.
    `createRenderEffect(() => props.title, (value) => { el.title = value; return () => { el.title = ""; }; });`,
    // RFC 01 §createTrackedEffect and onSettled: the single-callback form.
    `createTrackedEffect(() => { log(count()); return () => stop(); });`,
    `onSettled(() => { measureLayout(); const onResize = () => measureLayout(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); });`,
    // onCleanup in a compute is allowed (RFC 01; RFC 05's abort-before-await example).
    `createEffect(() => { const ac = new AbortController(); onCleanup(() => ac.abort()); return fetchIt(ac); }, (v) => { show(v); });`,
    // onCleanup in a function that runs later is fine.
    `createEffect(() => id(), (v) => { button.onclick = () => onCleanup(stop); });`,
    // Calls and identifiers aren't flagged (they may be functions); void is undefined.
    `createEffect(() => n(), (v) => { if (v) return v; });`,
    `createEffect(isDark, (dark) => apply(dark));`,
    `createEffect(isDark, (dark) => void document.body.classList.toggle("dark", dark));`,
    // createMemo options.
    `const doubled = createMemo(() => count() * 2, { lazy: true });`,
    `const opts = { lazy: true }; const m = createMemo(() => count(), opts);`,
    // Primitives in the component body, used in onSettled (RFC 08 §PRIMITIVE_IN_FORBIDDEN_SCOPE fix).
    `function C() { const [s] = createSignal(0); onSettled(() => { log(s()); }); return null; }`,
    // An identifier second argument that is a function.
    `const apply = (v) => { log(v); }; createEffect(() => id(), apply);`,
    // Not Solid's.
    `import { createEffect as fx } from "other"; fx(() => {});`,
  ].map((c) => ({ code: (c.startsWith("import") ? "" : I) + c, settings })),
  invalid: [
    // RFC 08 §MISSING_EFFECT_FN: the 1.x single-function effect.
    { code: `createEffect(() => { el().title = name(); });`, errors: [{ messageId: "missingApply" }] },
    { code: `createRenderEffect(() => { el.title = props.title; });`, errors: [{ messageId: "missingApply" }] },
    // ...with onCleanup: return it from the apply function once split.
    {
      code: `createEffect(() => { const id = setInterval(() => log(name()), 1000); onCleanup(() => clearInterval(id)); });`,
      errors: [{ messageId: "missingApply" }, { messageId: "cleanupInLegacyEffect" }],
    },
    // MIGRATION §Effects: the removed initialValue.
    {
      code: `createEffect((prev) => { log(prev, count()); return count(); }, 0);`,
      errors: [{ messageId: "initialValue" }],
    },
    {
      code: `const initial = 5; createEffect((prev) => count() + prev, initial);`,
      errors: [{ messageId: "initialValue" }],
    },
    { code: `const doubled = createMemo((prev) => count() * 2, 0);`, errors: [{ messageId: "memoInitialValue" }] },
    { code: `const list = createMemo((prev) => [...prev, x()], []);`, errors: [{ messageId: "memoInitialValue" }] },
    // RFC 08 §Invalid cleanup return value: expression bodies that can't be a cleanup (autofix wraps them).
    {
      code: `createEffect(() => name(), (value) => el.title = value);`,
      output: `createEffect(() => name(), (value) => { el.title = value; });`,
      errors: [{ messageId: "invalidCleanup" }],
    },
    {
      code: `createEffect(() => n(), (v) => (count += v));`,
      output: `createEffect(() => n(), (v) => { (count += v); });`,
      errors: [{ messageId: "invalidCleanup" }],
    },
    {
      code: `createEffect(() => n(), (v) => !v);`,
      output: `createEffect(() => n(), (v) => { !v; });`,
      errors: [{ messageId: "invalidCleanup" }],
    },
    {
      code: `onSettled(() => ({ ready: true }));`,
      output: `onSettled(() => { ({ ready: true }); });`,
      errors: [{ messageId: "invalidCleanup" }],
    },
    { code: `createEffect(() => n(), (v) => { if (v) return v > 1; });`, errors: [{ messageId: "invalidCleanup" }] },
    { code: `createTrackedEffect(() => { return 42; });`, errors: [{ messageId: "invalidCleanup" }] },
    { code: `createEffect(() => n(), async (v) => { await save(v); });`, errors: [{ messageId: "asyncCallback" }] },
    { code: `onSettled(async () => { await load(); });`, errors: [{ messageId: "asyncCallback" }] },
    // RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE: onCleanup in apply, createTrackedEffect, onSettled.
    {
      code: `createEffect(() => id(), (v) => { onCleanup(() => stop(v)); });`,
      errors: [{ messageId: "cleanupInScope" }],
    },
    {
      code: `createEffect(() => id(), { effect: (v) => { onCleanup(stop); } });`,
      errors: [{ messageId: "cleanupInScope" }],
    },
    { code: `createTrackedEffect(() => { onCleanup(stop); });`, errors: [{ messageId: "cleanupInScope" }] },
    { code: `onSettled(() => { [1, 2].forEach(() => onCleanup(stop)); });`, errors: [{ messageId: "cleanupInScope" }] },
    // RFC 08 §PRIMITIVE_IN_FORBIDDEN_SCOPE.
    { code: `onSettled(() => { const [s, setS] = createSignal(0); });`, errors: [{ messageId: "primitiveInLeaf" }] },
    { code: `createTrackedEffect(() => { createMemo(() => 1); });`, errors: [{ messageId: "primitiveInLeaf" }] },
  ].map(at2),
});

tester.run("effect-split (version 1)", rule, {
  valid: [
    `${I}createEffect(() => { onCleanup(stop); });`,
    `${I}const m = createMemo((prev) => prev + 1, 0);`,
    `${I}createEffect((prev) => count(), 0);`,
  ],
  invalid: [],
});
