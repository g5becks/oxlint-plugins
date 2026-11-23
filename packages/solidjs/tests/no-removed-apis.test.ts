import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-045: no-removed-apis (settings.solidjs.version 2 only). Cases follow the Solid 2.0
// MIGRATION guide's before/after examples (solidjs/solid documentation/solid-2.0 at cd201ce).
const rule = ruleOf(plugin, "no-removed-apis");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

type Err = { messageId: string; suggestions?: Array<{ messageId: string; output: string }> };
type Invalid = { code: string; output: string | null; errors: Err[] };
const at2 = (c: Invalid) => ({ ...c, settings });

tester.run("no-removed-apis", rule, {
  valid: [
    // 2.0 code.
    `import { Loading, Errored, Reveal, For, onSettled, merge, snapshot, isEqual, getObserver } from "solid-js";
const A = () => <Errored fallback={(e) => <p>{e().message}</p>}><Loading fallback={<p />}><For each={[]} keyed={false}>{(x) => x()}</For></Loading></Errored>;
onSettled(() => {});`,
    // Names that aren't Solid's: local functions and other modules.
    `function batch(fn: () => void) { fn(); } function on() {} batch(() => on());`,
    `import { batch, on, Suspense } from "some-lib"; batch(() => on()); const A = () => <Suspense />;`,
    // A 2.0 context provider.
    `import { createContext } from "solid-js"; const Theme = createContext("light"); const A = () => <Theme value="dark"><b /></Theme>;`,
    // Type-only imports aren't checked.
    `import type { Resource } from "solid-js"; let r: Resource<number>;`,
  ].map((code) => ({ code, settings })),
  invalid: [
    // ---- MIGRATION §Suspense / ErrorBoundary → Loading / Errored ----
    {
      code: `import { Suspense } from "solid-js";\nconst A = () => <Suspense fallback={<Spinner />}><Profile /></Suspense>;`,
      output: `import { Loading } from "solid-js";\nconst A = () => <Loading fallback={<Spinner />}><Profile /></Loading>;`,
      errors: [{ messageId: "renamed" }],
    },
    // Aliased: only the imported name changes.
    {
      code: `import { Suspense as S } from "solid-js";\nconst A = () => <S><Profile /></S>;`,
      output: `import { Loading as S } from "solid-js";\nconst A = () => <S><Profile /></S>;`,
      errors: [{ messageId: "renamed" }],
    },
    // The new name is already imported: drop the old specifier and use it.
    {
      code: `import { Loading, Suspense } from "solid-js";\nconst A = () => <Suspense><Loading /></Suspense>;`,
      output: `import { Loading } from "solid-js";\nconst A = () => <Loading><Loading /></Loading>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { Suspense, Loading as L } from "solid-js";\nconst A = () => <Suspense><L /></Suspense>;`,
      output: `import { Loading as L } from "solid-js";\nconst A = () => <L><L /></L>;`,
      errors: [{ messageId: "renamed" }],
    },
    // The new name is taken by something else: no fix.
    {
      code: `import { Suspense } from "solid-js";\nfunction Loading() { return null; }\nconst A = () => <Suspense><Loading /></Suspense>;`,
      output: null,
      errors: [{ messageId: "renamedNoFix" }],
    },
    // ErrorBoundary: the fallback's error is an accessor in 2.0 (err → err()).
    {
      code: `import { ErrorBoundary } from "solid-js";\nconst A = () => <ErrorBoundary fallback={(err, reset) => <p onClick={reset}>{err.message} {String(err)}</p>}><B /></ErrorBoundary>;`,
      output: `import { Errored } from "solid-js";\nconst A = () => <Errored fallback={(err, reset) => <p onClick={reset}>{err().message} {String(err())}</p>}><B /></Errored>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { ErrorBoundary } from "solid-js";\nconst A = () => <ErrorBoundary fallback={(e) => { log({ e }); return <p />; }}><B /></ErrorBoundary>;`,
      output: `import { Errored } from "solid-js";\nconst A = () => <Errored fallback={(e) => { log({ e: e() }); return <p />; }}><B /></Errored>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { ErrorBoundary } from "solid-js";\nconst A = () => <ErrorBoundary fallback={<p>failed</p>}><B /></ErrorBoundary>;`,
      output: `import { Errored } from "solid-js";\nconst A = () => <Errored fallback={<p>failed</p>}><B /></Errored>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { ErrorBoundary } from "solid-js";\nconst A = () => <ErrorBoundary fallback={({ message }) => <p>{message}</p>}><B /></ErrorBoundary>;`,
      output: null,
      errors: [{ messageId: "renamedNoFix" }],
    },
    {
      code: `import { ErrorBoundary } from "solid-js";\nconst A = () => <ErrorBoundary fallback={renderError}><B /></ErrorBoundary>;`,
      output: null,
      errors: [{ messageId: "renamedNoFix" }],
    },
    // ---- MIGRATION §Coordinating loading boundaries: SuspenseList → Reveal ----
    {
      code: `import { SuspenseList, Suspense } from "solid-js";\nconst A = () => <SuspenseList revealOrder="forwards" tail="collapsed"><Suspense><B /></Suspense></SuspenseList>;`,
      // Every fixable rename of a file is one combined fix, applied in a single pass.
      output: `import { Reveal, Loading } from "solid-js";\nconst A = () => <Reveal collapsed><Loading><B /></Loading></Reveal>;`,
      errors: [{ messageId: "renamed" }, { messageId: "renamed" }],
    },
    {
      code: `import { SuspenseList } from "solid-js";\nconst A = () => <SuspenseList revealOrder="together"><B /></SuspenseList>;`,
      output: `import { Reveal } from "solid-js";\nconst A = () => <Reveal order="together"><B /></Reveal>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { SuspenseList } from "solid-js";\nconst A = () => <SuspenseList revealOrder="backwards"><B /></SuspenseList>;`,
      output: null,
      errors: [{ messageId: "renamedNoFix" }],
    },
    // ---- RFC 03 §Index → For keyed={false}: same callback shape (item accessor, numeric index) ----
    {
      code: `import { Index } from "solid-js";\nconst A = () => <Index each={items()}>{(item, i) => <Row item={item()} index={i} />}</Index>;`,
      output: `import { For } from "solid-js";\nconst A = () => <For each={items()} keyed={false}>{(item, i) => <Row item={item()} index={i} />}</For>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { For, Index } from "solid-js";\nconst A = () => <Index each={rows()} fallback={<Empty />}>{(row) => <For each={row().cells}>{(c) => c}</For>}</Index>;`,
      output: `import { For } from "solid-js";\nconst A = () => <For each={rows()} fallback={<Empty />} keyed={false}>{(row) => <For each={row().cells}>{(c) => c}</For>}</For>;`,
      errors: [{ messageId: "renamed" }],
    },
    {
      code: `import { Index } from "solid-js";\nconst list = Index;`,
      output: null,
      errors: [{ messageId: "renamedNoFix" }],
    },
    // ---- MIGRATION §Effects, lifecycle, and cleanup: onMount → onSettled ----
    {
      code: `import { onMount } from "solid-js";\nonMount(() => {\n  measureLayout();\n});\nonMount(() => el.focus());`,
      output: `import { onSettled } from "solid-js";\nonSettled(() => {\n  measureLayout();\n});\nonSettled(() => { el.focus(); });`,
      errors: [{ messageId: "renamed" }],
    },
    ...[
      `onMount(() => { const id = setInterval(tick, 1000); onCleanup(() => clearInterval(id)); });`,
      `onMount(async () => { await load(); });`,
      `onMount(() => { const [s] = createSignal(0); use(s); });`,
      `onMount(() => { flush(); });`,
      `onMount(() => { return 1; });`,
      `onMount(init);`,
    ].map((body) => ({
      code: `import { onMount, onCleanup, createSignal, flush } from "solid-js";\n${body}`,
      output: null,
      errors: [{ messageId: "renamedNoFix" }],
    })),
    // A parenthesized object body stays an object (not a block with a label).
    {
      code: `import { onMount } from "solid-js";\nonMount(() => ({ ready: true }));`,
      output: `import { onSettled } from "solid-js";\nonSettled(() => { ({ ready: true }); });`,
      errors: [{ messageId: "renamed" }],
    },
    // A cleanup that only runs later (inside a nested function) is fine.
    {
      code: `import { onMount, onCleanup } from "solid-js";\nonMount(() => { button.addEventListener("click", () => onCleanup(stop)); });`,
      output: `import { onSettled, onCleanup } from "solid-js";\nonSettled(() => { button.addEventListener("click", () => onCleanup(stop)); });`,
      errors: [{ messageId: "renamed" }],
    },
    // ---- MIGRATION §Quick rename / removal map ----
    {
      code: `import { equalFn, getListener } from "solid-js";\nconst same = equalFn(a, b); const l = getListener();`,
      output: `import { isEqual, getObserver } from "solid-js";\nconst same = isEqual(a, b); const l = getObserver();`,
      errors: [{ messageId: "renamed" }, { messageId: "renamed" }],
    },
    // ---- Suggestions: behavior differs (MIGRATION §mergeProps / splitProps; §unwrap → snapshot) ----
    {
      code: `import { mergeProps } from "solid-js";\nconst merged = mergeProps(defaults, props);`,
      output: null,
      errors: [
        {
          messageId: "renamedReview",
          suggestions: [
            {
              messageId: "suggestRename",
              output: `import { merge } from "solid-js";\nconst merged = merge(defaults, props);`,
            },
          ],
        },
      ],
    },
    {
      code: `import { unwrap } from "solid-js/store";\nconst plain = unwrap(store);`,
      output: null,
      errors: [
        {
          messageId: "renamedReview",
          suggestions: [
            {
              messageId: "suggestRename",
              output: `import { snapshot } from "solid-js/store";\nconst plain = snapshot(store);`,
            },
          ],
        },
      ],
    },
    // ---- Report only (MIGRATION §Detailed removal guide; §Quick rename / removal map) ----
    ...[
      "createResource",
      "batch",
      "startTransition",
      "useTransition",
      "on",
      "createComputed",
      "splitProps",
      "createSelector",
      "onError",
      "catchError",
      "indexArray",
      "observable",
      "resetErrorBoundaries",
      "enableScheduling",
      "writeSignal",
    ].map((name) => ({
      code: `import { ${name} } from "solid-js";\nvoid ${name};`,
      output: null,
      errors: [{ messageId: "removed" }],
    })),
    ...["produce", "createMutable", "modifyMutable"].map((name) => ({
      code: `import { ${name} } from "solid-js/store";\nvoid ${name};`,
      output: null,
      errors: [{ messageId: "removed" }],
    })),
    ...["createDynamic", "clearDelegatedEvents"].map((name) => ({
      code: `import { ${name} } from "solid-js/web";\nvoid ${name};`,
      output: null,
      errors: [{ messageId: "removed" }],
    })),
    // ---- MIGRATION §Context providers ----
    {
      code: `import { createContext } from "solid-js";\nconst Theme = createContext("light");\nconst A = () => <Theme.Provider value="dark"><B /></Theme.Provider>;`,
      output: `import { createContext } from "solid-js";\nconst Theme = createContext("light");\nconst A = () => <Theme value="dark"><B /></Theme>;`,
      errors: [{ messageId: "provider" }],
    },
    // A type with the context's name (agentx sidebar.tsx shape).
    {
      code: `import { createContext } from "solid-js";\ntype Sidebar = { open: boolean };\nconst Sidebar = createContext<Sidebar | null>(null);\nconst A = () => <Sidebar.Provider value={null}><B /></Sidebar.Provider>;`,
      output: `import { createContext } from "solid-js";\ntype Sidebar = { open: boolean };\nconst Sidebar = createContext<Sidebar | null>(null);\nconst A = () => <Sidebar value={null}><B /></Sidebar>;`,
      errors: [{ messageId: "provider" }],
    },
    {
      code: `import { ThemeContext } from "./theme";\nconst A = () => <ThemeContext.Provider value="dark" />;`,
      output: `import { ThemeContext } from "./theme";\nconst A = () => <ThemeContext value="dark" />;`,
      errors: [{ messageId: "provider" }],
    },
    {
      code: `import { Ctx } from "~/stores/ctx";\nconst A = () => <Ctx.Provider value={1}><B /></Ctx.Provider>;`,
      output: `import { Ctx } from "~/stores/ctx";\nconst A = () => <Ctx value={1}><B /></Ctx>;`,
      errors: [{ messageId: "provider" }],
    },
    {
      code: `import { LibContext } from "some-lib";\nconst A = () => <LibContext.Provider value={1}><B /></LibContext.Provider>;`,
      output: null,
      errors: [{ messageId: "providerNoFix" }],
    },
    // ---- MIGRATION §/*@once*/ JSX marker ----
    {
      code: `const A = (props) => <input value={/*@once*/ props.initialValue} />;`,
      output: null,
      errors: [{ messageId: "once" }],
    },
  ].map(at2),
});

// Version 1: nothing is removed.
tester.run("no-removed-apis (version 1)", rule, {
  valid: [
    `import { Suspense, onMount, mergeProps, batch, Index } from "solid-js";\nonMount(() => {}); batch(() => {});\nconst A = () => <Suspense><Index each={[]}>{(x) => x()}</Index></Suspense>;`,
    `import { createContext } from "solid-js";\nconst T = createContext(1);\nconst A = () => <T.Provider value={2} />;`,
    `const A = (props) => <input value={/*@once*/ props.v} />;`,
  ],
  invalid: [],
});
