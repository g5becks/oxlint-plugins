import { defineRule, type ESTree, type Scope, type Variable } from "@oxlint/plugins";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";
import { trackImports } from "../utils/imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { SOLID_ANY_MODULE } from "../utils/solid2.ts";
import { walkTree } from "../utils/walk.ts";

// TASK-047. The static form of Solid 2.0's REACTIVE_WRITE_IN_OWNED_SCOPE (settings.solidjs.version 2
// only). Sources: RFC 01 §No writes under owned scope; RFC 08 §REACTIVE_WRITE_IN_OWNED_SCOPE;
// MIGRATION §"Write inside reactive scope" (owned scope). See docs/rules/no-write-in-reactive-scope.md.

/** Primitives whose `[1]` is a setter. */
const SETTER_SOURCES = ["createSignal", "createOptimistic", "createStore", "createOptimisticStore"];
/** Signal primitives that accept `{ ownedWrite: true }` (2.0.3 StoreOptions has no ownedWrite). */
const OWNED_WRITE_SOURCES = new Set(["createSignal", "createOptimistic"]);
/** Array methods whose callback runs in place. */
const SYNC_METHODS = /^(?:forEach|map|flatMap|reduce|reduceRight|find|findIndex|filter|every|some)$/;

type Identifier = Extract<ESTree.Node, { type: "Identifier" }>;

/** Scope marker for a write in a 1.x single-function createEffect/createRenderEffect. */
const LEGACY = "legacy-effect";

const hasOwnedWrite = (options: ESTree.Node | undefined): boolean =>
  options?.type === "ObjectExpression" &&
  options.properties.some(
    (p) =>
      p.type === "Property" &&
      !p.computed &&
      p.key.type === "Identifier" &&
      p.key.name === "ownedWrite" &&
      p.value.type === "Literal" &&
      p.value.value === true,
  );

const functionName = (fn: FunctionNode): string | null => {
  if ((fn.type === "FunctionDeclaration" || fn.type === "FunctionExpression") && fn.id) return fn.id.name;
  if (fn.parent?.type === "VariableDeclarator" && fn.parent.id.type === "Identifier") return fn.parent.id.name;
  return null;
};

const containsJSX = (fn: FunctionNode): boolean => {
  let found = false;
  if (!fn.body) return false;
  walkTree(fn.body, (node, skip) => {
    if (found) return skip();
    if (node.type === "JSXElement" || node.type === "JSXFragment") found = true;
  });
  return found;
};

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow writing signals and stores inside a memo, an effect's compute function, a derived signal or store, or a component body (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-write-in-reactive-scope.md",
    },
    schema: [],
    messages: {
      writeInScope:
        "Writing `{{name}}` in {{scope}} throws REACTIVE_WRITE_IN_OWNED_SCOPE in Solid 2.0, even inside untrack(). Derive the value instead (createMemo, or `createSignal(() => ...)` for a writable derived signal), or write from an event handler, an effect's apply function or onSettled.",
      writeInLegacyEffect:
        "Writing `{{name}}` in this 1.x single-function effect throws REACTIVE_WRITE_IN_OWNED_SCOPE once it becomes a Solid 2.0 compute function. To copy a value into state, use a writable derived signal, `createSignal(() => ...)`; for a side effect, split the effect and write in its apply function.",
      refreshInScope:
        "Calling refresh() in {{scope}} throws REACTIVE_WRITE_IN_OWNED_SCOPE in Solid 2.0. Call it from an event handler, an effect's apply function or an action.",
    },
  },
  createOnce(context) {
    const imports = trackImports(SOLID_ANY_MODULE);
    let setters = new Set<Variable>();
    let calls: ESTree.CallExpression[] = [];

    const solidName = (callee: ESTree.Node, names: string[]): string | undefined =>
      callee.type === "Identifier" ? imports.matchImport(names, callee.name) : undefined;

    const resolve = (node: Identifier): Variable | null => {
      for (let scope: Scope | null = context.sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(node.name);
        if (variable) return variable;
      }
      return null;
    };

    /** A function that runs in place, as part of the enclosing function's body. */
    const runsInPlace = (fn: FunctionNode): boolean => {
      const parent = fn.parent;
      if (parent?.type !== "CallExpression") return false;
      if (parent.callee === fn) return true; // IIFE
      if (parent.arguments[0] === fn && solidName(parent.callee, ["untrack", "flush"])) return true;
      return (
        parent.callee.type === "MemberExpression" &&
        !parent.callee.computed &&
        parent.callee.property.type === "Identifier" &&
        SYNC_METHODS.test(parent.callee.property.name) &&
        parent.arguments[0] === fn
      );
    };

    /** The owned scope a call executes in synchronously, as message text, or null. */
    const ownedScope = (call: ESTree.Node): string | null => {
      let node: ESTree.Node | null | undefined = call.parent;
      while (node && !(isFunctionNode(node) && !runsInPlace(node))) node = node.parent;
      if (!node || !isFunctionNode(node)) return null;
      const fn = node;
      const parent = fn.parent;
      if (parent?.type === "CallExpression" && parent.arguments[0] === fn) {
        const owner = solidName(parent.callee, [
          "createMemo",
          "createDeferred",
          "createEffect",
          "createRenderEffect",
          "createSignal",
          "createOptimistic",
          "createStore",
          "createOptimisticStore",
          "createProjection",
        ]);
        if (owner === "createMemo" || owner === "createDeferred") return "a memo";
        if (owner === "createEffect" || owner === "createRenderEffect") {
          // A 1.x single-function effect (effect-split reports the missing apply).
          return parent.arguments.length === 1 ? LEGACY : "an effect's compute function";
        }
        if (owner) return `a derived ${owner.includes("Store") || owner === "createProjection" ? "store" : "signal"}`;
        return null;
      }
      // A component: a capitalized function that renders JSX (as reactivity detects one).
      const name = functionName(fn);
      return name && /^[A-Z]/.test(name) && containsJSX(fn) ? "a component body" : null;
    };

    return {
      before() {
        imports.clear();
        setters = new Set();
        calls = [];
        // Writes under owned scope only throw in Solid 2.0.
        return readSolidVersion(context) === 2;
      },
      ImportDeclaration(node) {
        imports.handleImportDeclaration(node);
      },
      VariableDeclarator(node) {
        const init = node.init;
        if (init?.type !== "CallExpression" || node.id.type !== "ArrayPattern") return;
        const source = solidName(init.callee, SETTER_SOURCES);
        const setter = node.id.elements[1];
        if (!source || setter?.type !== "Identifier") return;
        if (OWNED_WRITE_SOURCES.has(source) && hasOwnedWrite(init.arguments[1] as ESTree.Node | undefined)) {
          return; // RFC 01: { ownedWrite: true } opts in.
        }
        const variable = resolve(setter);
        if (variable) setters.add(variable);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier") calls.push(node);
      },
      "Program:exit"() {
        for (const call of calls) {
          const callee = call.callee as Identifier;
          const isRefresh = Boolean(solidName(callee, ["refresh"]));
          if (!isRefresh) {
            const variable = resolve(callee);
            if (!variable || !setters.has(variable)) continue;
          }
          const scope = ownedScope(call);
          if (!scope) continue;
          context.report({
            node: call,
            messageId: isRefresh ? "refreshInScope" : scope === LEGACY ? "writeInLegacyEffect" : "writeInScope",
            data: { name: callee.name, scope: scope === LEGACY ? "a 1.x single-function effect" : scope },
          });
        }
      },
    };
  },
});
