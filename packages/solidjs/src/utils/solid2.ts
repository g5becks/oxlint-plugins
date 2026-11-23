/**
 * Solid 2.0 API tables, shared by the rules that branch on `settings.solidjs.version` (TASK-043).
 *
 * Authority: solidjs/solid `documentation/solid-2.0` at cd201ce390e234c46a6d29e8689364e26a14eccb
 * (MIGRATION.md and RFCs 01-09), checked against the solid-js 2.0.3, @solidjs/signals 2.0.3 and
 * @solidjs/web 2.0.3 type declarations. Every entry names the section it comes from (`cite`).
 */

export const SOLID2_DOCS =
  "https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0";

export type Solid2Module = "solid-js" | "@solidjs/web";

interface Cited {
  readonly cite: string;
}

export interface ModuleEntry extends Cited {
  readonly module: Solid2Module;
}

/** Modules a 1.x app imports Solid APIs from (the sources whose names the 2.0 rules check). */
export const SOLID1_MODULES: ReadonlySet<string> = new Set(["solid-js", "solid-js/web", "solid-js/store"]);

/** Modules a 2.0 app imports Solid APIs from. */
export const SOLID2_MODULES: ReadonlySet<string> = new Set(["solid-js", "@solidjs/web"]);

const CORE = "solid-js 2.0.3 types/index.d.ts";
const STORES = "MIGRATION §Imports: where things live now (stores are exported from solid-js)";
const WEB = "MIGRATION §Imports: where things live now (the DOM runtime is @solidjs/web)";

function entries<T>(names: readonly string[], value: T): Array<[string, T]> {
  return names.map((n) => [n, value]);
}

/** Where each 2.0 value export lives. Flow components re-exported by @solidjs/web map to solid-js. */
export const MODULES_V2: ReadonlyMap<string, ModuleEntry> = new Map<string, ModuleEntry>([
  ...entries(
    [
      "createSignal",
      "createMemo",
      "createEffect",
      "createRenderEffect",
      "createTrackedEffect",
      "createReaction",
      "createDeferred",
      "createRoot",
      "createContext",
      "useContext",
      "children",
      "createComponent",
      "lazy",
      "createUniqueId",
      "untrack",
      "flush",
      "onCleanup",
      "onSettled",
      "onFlush",
      "getOwner",
      "getObserver",
      "runWithOwner",
      "isEqual",
      "isPending",
      "latest",
      "refresh",
      "affects",
      "resolve",
      "until",
      "action",
      "createOptimistic",
      "mapArray",
      "repeat",
      "merge",
      "omit",
      "from",
      "NotReadyError",
      "dynamicComponent",
      "For",
      "Repeat",
      "Show",
      "Switch",
      "Match",
      "Errored",
      "Loading",
      "Reveal",
      "NoHydration",
      "Hydration",
      "DEV",
    ],
    { module: "solid-js" as const, cite: CORE },
  ),
  ...entries(["createStore", "createProjection", "createOptimisticStore", "reconcile", "snapshot", "deep"], {
    module: "solid-js" as const,
    cite: STORES,
  }),
  ...entries(
    [
      "render",
      "hydrate",
      "renderToString",
      "renderToStream",
      "generateHydrationScript",
      "HydrationScript",
      "Portal",
      "Dynamic",
      "dynamic",
      "clientOnly",
      "isServer",
      "isDev",
      "httpStatus",
      "httpHeader",
      "getRequestEvent",
    ],
    { module: "@solidjs/web" as const, cite: WEB },
  ),
]);

/**
 * Where each 2.0 type export lives. `ComponentProps` and `ValidComponent` exist in both packages
 * with different meanings, so they are deliberately absent.
 */
export const TYPE_MODULES_V2: ReadonlyMap<string, ModuleEntry> = new Map<string, ModuleEntry>([
  ...entries(
    [
      "Accessor",
      "Setter",
      "Signal",
      "Component",
      "VoidProps",
      "VoidComponent",
      "ParentProps",
      "ParentComponent",
      "FlowProps",
      "FlowComponent",
      "Ref",
      "Context",
      "Element",
      "Owner",
      "Store",
      "StoreSetter",
      "StoreNode",
    ],
    { module: "solid-js" as const, cite: CORE },
  ),
  ...entries(["JSX", "MountableElement"], {
    module: "@solidjs/web" as const,
    cite: "RFC 09 §Renderer packages own JSX namespaces",
  }),
]);

export interface PathEntry extends Cited {
  readonly to: string;
}

/** 1.x subpath imports and their 2.0 replacements. */
export const PATHS_V2: ReadonlyMap<string, PathEntry> = new Map<string, PathEntry>([
  ["solid-js/web", { to: "@solidjs/web", cite: "MIGRATION §Quick rename / removal map (Import paths)" }],
  ["solid-js/store", { to: "solid-js", cite: "MIGRATION §Quick rename / removal map (Import paths)" }],
  ["solid-js/h", { to: "@solidjs/h", cite: "MIGRATION §Quick rename / removal map (Import paths)" }],
  ["solid-js/html", { to: "@solidjs/html", cite: "MIGRATION §Quick rename / removal map (Import paths)" }],
  ["solid-js/universal", { to: "@solidjs/universal", cite: "MIGRATION §Quick rename / removal map (Import paths)" }],
  ["solid-js/jsx-runtime", { to: "@solidjs/web/jsx-runtime", cite: "RFC 09 §Migration / replacement" }],
  ["solid-js/jsx-dev-runtime", { to: "@solidjs/web/jsx-dev-runtime", cite: "RFC 09 §Migration / replacement" }],
]);

export interface RenameEntry extends Cited {
  /** The 2.0 name. */
  readonly to: string;
  /**
   * `fix`: an autofix (subject to the rule's per-site safety checks);
   * `suggest`: a suggestion only, because the 2.0 API behaves differently.
   */
  readonly apply: "fix" | "suggest";
}

/** 1.x names with a 2.0 replacement under another name. */
export const RENAMES_V2: ReadonlyMap<string, RenameEntry> = new Map<string, RenameEntry>([
  ["Suspense", { to: "Loading", apply: "fix", cite: "MIGRATION §Suspense / ErrorBoundary → Loading / Errored" }],
  ["ErrorBoundary", { to: "Errored", apply: "fix", cite: "MIGRATION §Suspense / ErrorBoundary → Loading / Errored" }],
  [
    "SuspenseList",
    { to: "Reveal", apply: "fix", cite: "MIGRATION §Coordinating loading boundaries: SuspenseList → Reveal" },
  ],
  ["Index", { to: "For", apply: "fix", cite: "RFC 03 §Index → For keyed={false}" }],
  ["onMount", { to: "onSettled", apply: "fix", cite: "MIGRATION §Effects, lifecycle, and cleanup" }],
  ["equalFn", { to: "isEqual", apply: "fix", cite: "MIGRATION §Quick rename / removal map (Renames)" }],
  ["getListener", { to: "getObserver", apply: "fix", cite: "MIGRATION §Quick rename / removal map (Renames)" }],
  ["mergeProps", { to: "merge", apply: "suggest", cite: "MIGRATION §mergeProps / splitProps → merge / omit" }],
  ["unwrap", { to: "snapshot", apply: "suggest", cite: "MIGRATION §unwrap(store) → snapshot(store)" }],
]);

export interface RemovedEntry extends Cited {
  /** What to use instead, as message text. */
  readonly replacement: string;
}

/** 1.x APIs removed in 2.0 without a 1:1 replacement (report only). */
export const REMOVED_V2: ReadonlyMap<string, RemovedEntry> = new Map<string, RemovedEntry>([
  [
    "createResource",
    {
      replacement: "an async createMemo (or createStore(fn)) under <Loading>",
      cite: "MIGRATION §createResource → async computations + Loading",
    },
  ],
  [
    "batch",
    {
      replacement: "nothing (writes are batched by default); flush() for synchronous application",
      cite: "MIGRATION §batch → default microtask batching + flush()",
    },
  ],
  [
    "startTransition",
    {
      replacement: "built-in transitions with isPending/<Loading> and the optimistic APIs",
      cite: "MIGRATION §Quick rename / removal map (Removals)",
    },
  ],
  [
    "useTransition",
    {
      replacement: "built-in transitions with isPending/<Loading> and the optimistic APIs",
      cite: "MIGRATION §Quick rename / removal map (Removals)",
    },
  ],
  ["on", { replacement: "a split effect: createEffect(compute, apply)", cite: "MIGRATION §on helper → split effects" }],
  [
    "produce",
    {
      replacement: "a draft setter: setStore(s => { ... })",
      cite: "MIGRATION §produce → now the default setter behavior",
    },
  ],
  [
    "createComputed",
    {
      replacement: "createMemo, a split createEffect, or createSignal(fn)",
      cite: "MIGRATION §createComputed → createMemo, createEffect, or derived createSignal",
    },
  ],
  [
    "createMutable",
    {
      replacement: "createStore with draft setters",
      cite: "MIGRATION §createMutable / modifyMutable → createStore with draft setters",
    },
  ],
  [
    "modifyMutable",
    {
      replacement: "createStore with draft setters",
      cite: "MIGRATION §createMutable / modifyMutable → createStore with draft setters",
    },
  ],
  [
    "splitProps",
    {
      replacement: "omit(props, ...keys), reading the picked keys from props",
      cite: "MIGRATION §mergeProps / splitProps → merge / omit",
    },
  ],
  [
    "createSelector",
    { replacement: "createProjection or createStore(fn)", cite: "MIGRATION §Quick rename / removal map (Renames)" },
  ],
  [
    "onError",
    {
      replacement: "<Errored> or the effect error option",
      cite: "MIGRATION §onError / catchError → Errored + effect error option",
    },
  ],
  [
    "catchError",
    {
      replacement: "<Errored> or the effect error option",
      cite: "MIGRATION §onError / catchError → Errored + effect error option",
    },
  ],
  [
    "indexArray",
    { replacement: "mapArray(list, fn, { keyed: false })", cite: "MIGRATION §Quick rename / removal map (Removals)" },
  ],
  [
    "observable",
    {
      replacement: "a split createEffect that pushes to the external subscriber",
      cite: "MIGRATION §from / observable → from returns an async iterable / effects",
    },
  ],
  [
    "resetErrorBoundaries",
    {
      replacement: "nothing (error boundaries heal automatically)",
      cite: "MIGRATION §Quick rename / removal map (Removals)",
    },
  ],
  ["enableScheduling", { replacement: "nothing (removed)", cite: "MIGRATION §Quick rename / removal map (Removals)" }],
  [
    "writeSignal",
    { replacement: "nothing (it was an internal API)", cite: "MIGRATION §Quick rename / removal map (Removals)" },
  ],
  [
    "createDynamic",
    {
      replacement: "the dynamic(source) factory from @solidjs/web",
      cite: "MIGRATION §Dynamic components: createDynamic / <Dynamic> → dynamic factory",
    },
  ],
  [
    "clearDelegatedEvents",
    {
      replacement: "disposing the render root",
      cite: "MIGRATION §Attributes & events: closer to HTML (and fewer namespaces)",
    },
  ],
]);
