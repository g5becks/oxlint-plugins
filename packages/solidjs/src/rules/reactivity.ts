import {
  type Context,
  defineRule,
  type ESTree,
  type Location,
  type Reference,
  type Scope,
  type SourceCode,
  type Variable,
} from "@oxlint/plugins";
import { trackImports } from "../utils/imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { SOLID_ANY_MODULE } from "../utils/solid2.ts";
import { isDOMElementName, isJSXElementOrFragment } from "../utils/jsx.ts";
import { trace } from "../utils/trace.ts";
import { findParent } from "../utils/traverse.ts";
import { walkTree } from "../utils/walk.ts";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";
import { ruleOptions } from "../utils/options.ts";

// ---- Inlined helpers ----

type Child = ESTree.Node | null | undefined;
type IdentifierNode = Extract<ESTree.Node, { type: "Identifier" }>;

const isProgramOrFunctionNode = (node: Child): boolean => !!node && (node.type === "Program" || isFunctionNode(node));

const isPropsByName = (name: string): boolean => /[pP]rops/.test(name);

const getFunctionName = (node: FunctionNode): string | null => {
  if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && node.id != null) {
    return node.id.name;
  }
  if (node.parent.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
};

function ignoreTransparentWrappers(node: ESTree.Node, up = false): ESTree.Node {
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression") {
    const next = up ? node.parent : node.expression;
    if (next) return ignoreTransparentWrappers(next, up);
  }
  return node;
}

function findInScope(
  node: ESTree.Node,
  scope: ESTree.Node,
  predicate: (n: ESTree.Node) => boolean,
): ESTree.Node | null {
  let current: Child = node;
  while (current) {
    if (current === scope) return predicate(node) ? current : null;
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

function findVariable(context: Context, node: IdentifierNode): Variable | null {
  const scope = context.sourceCode.getScope(node);
  if (!scope) return null;
  // Walk up scopes to find variable
  let s: Scope | null = scope;
  while (s) {
    const v = s.set?.get?.(node.name);
    if (v) return v;
    s = s.upper;
  }
  return null;
}

function getFunctionHeadLoc(node: FunctionNode, sourceCode: SourceCode): Location {
  const parent = node.parent;
  if (node.type === "ArrowFunctionExpression") {
    const arrowToken = sourceCode.getTokenBefore(node.body, { filter: (t) => t.value === "=>" });
    if (arrowToken) {
      return {
        start: node.loc.start,
        end: arrowToken.loc.end,
      };
    }
  }
  if (node.id) {
    return node.id.loc;
  }
  if (parent.type === "VariableDeclarator" && parent.id.loc) {
    return parent.id.loc;
  }
  return node.loc;
}

// ---- ScopeStack classes ----

interface ReactiveVariable {
  references: Reference[];
  declarationScope: ESTree.Node;
  variable: Variable;
}

interface TrackedScope {
  node: ESTree.Node;
  // "apply" and "untracked" exist only at settings.solidjs.version 2 (TASK-044): the apply half of a
  // split effect, and control-flow callback bodies. Reads lifted out of them are reported.
  expect: "function" | "called-function" | "expression" | "apply" | "untracked";
}

/** A reactive read lifted out of a function into its parent scope (version 2 only). */
interface LiftedRead {
  node: ESTree.Node;
  name: string;
  start: number;
}

class ScopeStackItem {
  node: ESTree.Node;
  trackedScopes: TrackedScope[] = [];
  unnamedDerivedSignals = new Set<FunctionNode>();
  hasJSX = false;
  // Version 2 only: reads that made a child function an unnamed derived signal, and the end of this
  // function's first await (reads after it aren't tracked; RFC 08 UNTRACKED_READ_AFTER_AWAIT).
  liftedReads = new Map<ESTree.Node, LiftedRead[]>();
  firstAwaitEnd: number | undefined = undefined;
  constructor(node: ESTree.Node) {
    this.node = node;
  }
}

class ScopeStack {
  private items: ScopeStackItem[] = [];
  private signals: ReactiveVariable[] = [];
  private props: ReactiveVariable[] = [];
  syncCallbacks = new Set<ESTree.Node>();
  /** Version 2 only: the end of each finished function's first await. */
  awaitBoundaries = new Map<ESTree.Node, number>();

  // ---- Stack operations ----

  push(item: ScopeStackItem): void {
    this.items.push(item);
  }

  pop(): ScopeStackItem | undefined {
    return this.items.pop();
  }

  // These are guaranteed non-null at the call sites (stack is always non-empty).
  currentScope = (): ScopeStackItem => this.items[this.items.length - 1]!;
  parentScope = (): ScopeStackItem => this.items[this.items.length - 2]!;

  findIndex(predicate: (item: ScopeStackItem) => boolean): number {
    return this.items.findIndex(predicate);
  }

  // Return a ScopeStackItem by index (supports negative indices like Array.at).
  at(index: number): ScopeStackItem | undefined {
    if (index < 0) {
      return this.items[this.items.length + index];
    }
    return this.items[index];
  }

  get length(): number {
    return this.items.length;
  }

  // ---- Reactive variable tracking ----

  pushSignal(variable: Variable, declarationScope?: ESTree.Node) {
    if (!declarationScope) declarationScope = this.currentScope().node;
    this.signals.push({
      references: variable.references.filter((ref) => !ref.init),
      variable,
      declarationScope,
    });
  }

  pushUniqueSignal(variable: Variable, declarationScope: ESTree.Node) {
    const found = this.signals.find((s) => s.variable === variable);
    if (!found) {
      this.pushSignal(variable, declarationScope);
    } else {
      found.declarationScope = this.findDeepest(found.declarationScope, declarationScope);
    }
  }

  pushProps(variable: Variable, declarationScope?: ESTree.Node) {
    if (!declarationScope) declarationScope = this.currentScope().node;
    this.props.push({
      references: variable.references.filter((ref) => !ref.init),
      variable,
      declarationScope,
    });
  }

  *consumeSignalReferencesInScope() {
    yield* this.consumeRefs(this.signals);
    this.signals = this.signals.filter((v) => v.references.length !== 0);
  }

  *consumePropsReferencesInScope() {
    yield* this.consumeRefs(this.props);
    this.props = this.props.filter((v) => v.references.length !== 0);
  }

  private *consumeRefs(
    variables: ReactiveVariable[],
  ): Iterable<{ reference: Reference; declarationScope: ESTree.Node }> {
    for (const variable of variables) {
      const inScope: Reference[] = [];
      const notInScope: Reference[] = [];
      variable.references.forEach((ref) => {
        if (this.isRefInCurrentScope(ref)) inScope.push(ref);
        else notInScope.push(ref);
      });
      yield* inScope.map((ref) => ({
        reference: ref,
        declarationScope: variable.declarationScope,
      }));
      variable.references = notInScope;
    }
  }

  private findDeepest(a: ESTree.Node, b: ESTree.Node): ESTree.Node {
    if (a === b) return a;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const { node } = this.items[i]!;
      if (a === node || b === node) return node;
    }
    return a;
  }

  private isRefInCurrentScope(reference: Reference) {
    let parentFn = findParent(reference.identifier, isProgramOrFunctionNode);
    while (isFunctionNode(parentFn) && this.syncCallbacks.has(parentFn)) {
      parentFn = findParent(parentFn, isProgramOrFunctionNode);
    }
    return parentFn === this.currentScope().node;
  }
}

// ---- Helper functions ----

const getNthDestructuredVar = (id: Child, n: number, context: Context): Variable | null => {
  if (id?.type === "ArrayPattern") {
    const el = id.elements[n];
    if (el?.type === "Identifier") return findVariable(context, el);
  }
  return null;
};

const getReturnedVar = (id: ESTree.Node, context: Context): Variable | null => {
  if (id.type === "Identifier") return findVariable(context, id);
  return null;
};

// ---- Version 2 helpers (TASK-044) ----

/**
 * 1.x APIs that 2.0 removed. A version-2 file that still uses them keeps their 1.x treatment, so
 * reactivity adds no noise to what no-removed-apis reports (TASK-044).
 */
const REMOVED_KNOWN_TO_V1 = [
  "on",
  "createComputed",
  "createSelector",
  "createResource",
  "createMutable",
  "observable",
  "indexArray",
  "onMount",
  "onError",
  "mergeProps",
  "splitProps",
  "useTransition",
  "batch",
  "produce",
  "Index",
];

/** Calls whose function argument runs in place (version 2). */
const SYNC_V2 = ["flush", "isPending", "latest", "batch", "produce"];
/** Primitives whose second tuple element is a setter taking a callback (version 2). */
const SETTER_SOURCES_V2 = ["createSignal", "createStore", "createOptimistic", "createOptimisticStore"];

/**
 * A list's keying mode (RFC 03 §List rendering): "default" (no keyed), a literal true/false, a key
 * function, or a dynamic value whose callback shape can't be known.
 */
type KeyedMode = "default" | true | false | "fn" | "dynamic";

function keyedValue(value: Child): KeyedMode {
  if (value?.type === "Literal" && typeof value.value === "boolean") return value.value;
  if (isFunctionNode(value)) return "fn";
  return "dynamic";
}

/** The `keyed` option of `mapArray(list, fn, options)`. */
function keyedOption(options: Child): KeyedMode {
  if (!options) return "default";
  if (options.type !== "ObjectExpression") return "dynamic";
  const keyed = options.properties.find(
    (p): p is Extract<ESTree.ObjectExpression["properties"][number], { type: "Property" }> =>
      p.type === "Property" && !p.computed && p.key.type === "Identifier" && p.key.name === "keyed",
  );
  return keyed ? keyedValue(keyed.value) : "default";
}

/** The `keyed` prop of a JSX element (`<For keyed>` is `true`). */
function keyedAttribute(element: ESTree.JSXElement): KeyedMode {
  let mode: KeyedMode = "default";
  for (const attr of element.openingElement.attributes) {
    if (attr.type === "JSXSpreadAttribute") return "dynamic";
    if (attr.name.type !== "JSXIdentifier" || attr.name.name !== "keyed") continue;
    if (attr.value === null) mode = true;
    else if (attr.value.type === "JSXExpressionContainer" && attr.value.expression.type !== "JSXEmptyExpression") {
      mode = keyedValue(attr.value.expression);
    } else mode = "dynamic";
  }
  return mode;
}

// ---- Rule export ----

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce that reactivity (props, signals, memos, etc.) is properly used, so changes in those values will be tracked and update the view as expected.",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/reactivity.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          customReactiveFunctions: {
            description:
              "List of function names to consider as reactive functions (allow signals to be safely passed as arguments). In addition, any create* or use* functions are automatically included.",
            type: "array",
            items: { type: "string" },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noWrite: "The reactive variable '{{name}}' should not be reassigned or altered directly.",
      untrackedReactive:
        "The reactive variable '{{name}}' should be used within JSX, a tracked scope (like createEffect), or inside an event handler function, or else changes will be ignored.",
      expectedFunctionGotExpression:
        "The reactive variable '{{name}}' should be wrapped in a function for reactivity. This includes event handler bindings on native elements, which are not reactive like other JSX props.",
      badSignal: "The reactive variable '{{name}}' should be called as a function when used in {{where}}.",
      badUnnamedDerivedSignal:
        "This function should be passed to a tracked scope (like createEffect) or an event handler because it contains reactivity, or else changes will be ignored.",
      shouldDestructure:
        "For proper analysis, array destructuring should be used to capture the {{nth}}result of this function call.",
      shouldAssign: "For proper analysis, a variable should be used to capture the result of this function call.",
      noAsyncTrackedScope: "This tracked scope should not be async. Solid's reactivity only tracks synchronously.",
      readInApply:
        "The reactive variable '{{name}}' is read in the effect's apply function, which isn't tracked. Read it in the compute function and use the value passed to apply.",
      readAfterAwait:
        "The reactive variable '{{name}}' is first read after an await, so it isn't a dependency of this computation. Read it before the first await, or wrap the read in untrack() if a one-time value is intended.",
    },
    defaultOptions: [{ customReactiveFunctions: [] }],
  },
  createOnce(context) {
    const getCustomReactiveFunctions = (): string[] =>
      ruleOptions<{ customReactiveFunctions?: Array<string> }>(context)?.customReactiveFunctions ?? [];

    const warnShouldDestructure = (node: ESTree.Node, nth?: string) =>
      context.report({
        node,
        messageId: "shouldDestructure",
        data: nth ? { nth: nth + " " } : undefined,
      });
    const warnShouldAssign = (node: ESTree.Node) => context.report({ node, messageId: "shouldAssign" });

    // createOnce runs once per worker: the scope stack (including syncCallbacks and the
    // signal/props lists) and the import tracker are recreated/cleared for every file in
    // before() (audit R10). Upstream eslint-plugin-solid creates them per file in create().
    let scopeStack = new ScopeStack();
    let currentScope = scopeStack.currentScope;
    let parentScope = scopeStack.parentScope;
    // settings.solidjs.version 2 (TASK-044) switches to the Solid 2.0 model; it also recognizes
    // imports from @solidjs/web. Version 1 uses the 1.x tracker and code paths, unchanged.
    let v2 = false;
    const importsV1 = trackImports();
    const importsV2 = trackImports(SOLID_ANY_MODULE);
    let imports = importsV1;
    // Rebound per file in before(), so version 1 calls the 1.x tracker directly.
    let matchImport = importsV1.matchImport;
    const handleImportDeclaration = (node: ESTree.ImportDeclaration) => imports.handleImportDeclaration(node);

    const markPropsOnCondition = (node: any, cb: (props: any) => boolean) => {
      if (
        node.params.length === 1 &&
        node.params[0].type === "Identifier" &&
        node.parent?.type !== "JSXExpressionContainer" &&
        node.parent?.type !== "TemplateLiteral" &&
        cb(node.params[0])
      ) {
        const propsParam = findVariable(context, node.params[0]);
        if (propsParam) scopeStack.pushProps(propsParam, node);
      }
    };

    const onFunctionEnter = (node: any) => {
      if (isFunctionNode(node)) {
        if (scopeStack.syncCallbacks.has(node)) return;
        markPropsOnCondition(node, (props: any) => isPropsByName(props.name));
      }
      scopeStack.push(new ScopeStackItem(node));
    };

    const matchTrackedScope = (trackedScope: TrackedScope, node: ESTree.Node): boolean => {
      switch (trackedScope.expect) {
        case "function":
        case "called-function":
        case "apply":
        case "untracked":
          return node === trackedScope.node;
        case "expression":
          return Boolean(findInScope(node, currentScope().node, (n) => n === trackedScope.node));
      }
    };

    const handleTrackedScopes = (identifier: any, declarationScope: any) => {
      const currentScopeNode = currentScope().node;
      if (!currentScope().trackedScopes.find((ts) => matchTrackedScope(ts, identifier))) {
        const matchedExpression = currentScope().trackedScopes.find((ts) =>
          matchTrackedScope({ ...ts, expect: "expression" }, identifier),
        );
        if (declarationScope === currentScopeNode) {
          let parentMemberExpression: any = null;
          if (identifier.parent?.type === "MemberExpression") {
            parentMemberExpression = identifier.parent;
            while (parentMemberExpression?.parent?.type === "MemberExpression") {
              parentMemberExpression = parentMemberExpression.parent;
            }
          }
          const parentCallExpression = identifier.parent?.type === "CallExpression" ? identifier.parent : null;
          context.report({
            node: parentMemberExpression ?? parentCallExpression ?? identifier,
            messageId: matchedExpression ? "expectedFunctionGotExpression" : "untrackedReactive",
            data: {
              name: parentMemberExpression ? context.sourceCode.getText(parentMemberExpression) : identifier.name,
            },
          });
        } else {
          if (!parentScope() || !isFunctionNode(currentScopeNode)) return;

          const pushUnnamedDerivedSignal = () => {
            (parentScope().unnamedDerivedSignals ??= new Set()).add(currentScopeNode);
            if (v2) recordLiftedRead(parentScope(), currentScopeNode, identifier);
          };

          if (currentScopeNode.type === "FunctionDeclaration") {
            const functionVariable = context.sourceCode.scopeManager?.getDeclaredVariables(currentScopeNode)?.[0];
            if (functionVariable) {
              scopeStack.pushUniqueSignal(functionVariable, declarationScope);
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentScopeNode.parent?.type === "VariableDeclarator") {
            const declarator = currentScopeNode.parent;
            const functionVariable = context.sourceCode.scopeManager?.getDeclaredVariables(declarator)?.[0];
            if (functionVariable) {
              scopeStack.pushUniqueSignal(functionVariable, declarationScope);
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentScopeNode.parent?.type === "Property") {
            // ignore for now (version 2 still records the read, for EffectBundle apply functions)
            if (v2) recordLiftedRead(parentScope(), currentScopeNode, identifier);
          } else {
            pushUnnamedDerivedSignal();
          }
        }
      }
    };

    const onFunctionExit = (currentScopeNode: any) => {
      if (isFunctionNode(currentScopeNode)) {
        markPropsOnCondition(currentScopeNode, (props: any) => {
          if (!isPropsByName(props.name) && currentScope().hasJSX) {
            const functionName = getFunctionName(currentScopeNode);
            if (functionName && !/^[a-z]/.test(functionName)) return true;
          }
          return false;
        });
      }

      if (isFunctionNode(currentScopeNode) && scopeStack.syncCallbacks.has(currentScopeNode)) {
        return;
      }

      // Process signal references
      for (const { reference, declarationScope } of scopeStack.consumeSignalReferencesInScope()) {
        const identifier = reference.identifier;
        if (reference.isWrite()) {
          context.report({
            node: identifier,
            messageId: "noWrite",
            data: { name: identifier.name },
          });
        } else if (identifier.type === "Identifier") {
          const reportBadSignal = (where: string) =>
            context.report({
              node: identifier,
              messageId: "badSignal",
              data: { name: identifier.name, where },
            });
          if (
            identifier.parent?.type === "CallExpression" ||
            (identifier.parent?.type === "ArrayExpression" && identifier.parent.parent?.type === "CallExpression")
          ) {
            handleTrackedScopes(identifier, declarationScope);
          } else if (identifier.parent?.type === "TemplateLiteral") {
            reportBadSignal("template literals");
          } else if (
            identifier.parent?.type === "BinaryExpression" &&
            ["<", "<=", ">", ">=", "<<", ">>", ">>>", "+", "-", "*", "/", "%", "**", "|", "^", "&", "in"].includes(
              identifier.parent.operator,
            )
          ) {
            reportBadSignal("arithmetic or comparisons");
          } else if (
            identifier.parent?.type === "UnaryExpression" &&
            ["-", "+", "~"].includes(identifier.parent.operator)
          ) {
            reportBadSignal("unary expressions");
          } else if (
            identifier.parent?.type === "MemberExpression" &&
            identifier.parent.computed &&
            identifier.parent.property === identifier
          ) {
            reportBadSignal("property accesses");
          } else if (
            identifier.parent?.type === "JSXExpressionContainer" &&
            !currentScope().trackedScopes.find(
              (ts) => ts.node === identifier && (ts.expect === "function" || ts.expect === "called-function"),
            )
          ) {
            const elementOrAttribute = identifier.parent.parent;
            if (
              isJSXElementOrFragment(elementOrAttribute) ||
              (elementOrAttribute?.type === "JSXAttribute" &&
                elementOrAttribute.parent?.type === "JSXOpeningElement" &&
                elementOrAttribute.parent.name.type === "JSXIdentifier" &&
                isDOMElementName(elementOrAttribute.parent.name.name))
            ) {
              reportBadSignal("JSX");
            }
          }
        }
      }

      // Process props references
      for (const { reference, declarationScope } of scopeStack.consumePropsReferencesInScope()) {
        const identifier = reference.identifier;
        if (reference.isWrite()) {
          context.report({
            node: identifier,
            messageId: "noWrite",
            data: { name: identifier.name },
          });
        } else if (identifier.parent?.type === "MemberExpression" && identifier.parent.object === identifier) {
          const { parent } = identifier;
          if (parent.parent?.type === "AssignmentExpression" && parent.parent.left === parent) {
            context.report({
              node: identifier,
              messageId: "noWrite",
              data: { name: identifier.name },
            });
          } else if (
            parent.property.type === "Identifier" &&
            /^(?:initial|default|static[A-Z])/.test(parent.property.name)
          ) {
            // Props with initial/default prefix: do nothing
          } else {
            handleTrackedScopes(identifier, declarationScope);
          }
        } else if (
          identifier.parent?.type === "AssignmentExpression" ||
          identifier.parent?.type === "VariableDeclarator"
        ) {
          context.report({
            node: identifier,
            messageId: "untrackedReactive",
            data: { name: identifier.name },
          });
        }
      }

      // Check unnamed derived signals
      const { unnamedDerivedSignals } = currentScope();
      if (unnamedDerivedSignals) {
        for (const node of unnamedDerivedSignals) {
          const trackedScope = currentScope().trackedScopes.find((ts) => matchTrackedScope(ts, node));
          if (!trackedScope) {
            context.report({
              loc: getFunctionHeadLoc(node, context.sourceCode),
              messageId: "badUnnamedDerivedSignal",
            });
          } else if (v2) {
            checkLiftedReads(node, trackedScope);
          }
        }
      }
      if (v2) {
        // Functions in object properties (EffectBundle { effect, error }) aren't derived signals.
        for (const fn of currentScope().liftedReads.keys()) {
          if (unnamedDerivedSignals?.has(fn as FunctionNode) || !isFunctionNode(fn)) continue;
          const trackedScope = currentScope().trackedScopes.find((ts) => matchTrackedScope(ts, fn));
          if (trackedScope) checkLiftedReads(fn, trackedScope);
        }
      }

      if (v2 && currentScope().firstAwaitEnd !== undefined) {
        scopeStack.awaitBoundaries.set(currentScopeNode, currentScope().firstAwaitEnd!);
      }
      scopeStack.pop();
    };

    // ---- Version 2: reads lifted out of apply functions, callback bodies and async computations ----
    const recordLiftedRead = (parent: ScopeStackItem, fn: ESTree.Node, identifier: any) => {
      let member: any = null;
      if (identifier.parent?.type === "MemberExpression") {
        member = identifier.parent;
        while (member?.parent?.type === "MemberExpression") member = member.parent;
      }
      const call = identifier.parent?.type === "CallExpression" ? identifier.parent : null;
      const reads = parent.liftedReads.get(fn) ?? [];
      reads.push({
        node: member ?? call ?? identifier,
        name: member ? context.sourceCode.getText(member) : identifier.name,
        start: identifier.range[0],
      });
      parent.liftedReads.set(fn, reads);
    };

    const checkLiftedReads = (fn: FunctionNode, trackedScope: TrackedScope) => {
      const reads = currentScope().liftedReads.get(fn);
      if (!reads) return;
      const reported = new Set<ESTree.Node>();
      const report = (read: LiftedRead, messageId: "readInApply" | "untrackedReactive" | "readAfterAwait") => {
        if (reported.has(read.node)) return;
        reported.add(read.node);
        context.report({ node: read.node, messageId, data: { name: read.name } });
      };
      if (trackedScope.expect === "apply") {
        for (const read of reads) report(read, "readInApply");
      } else if (trackedScope.expect === "untracked") {
        for (const read of reads) report(read, "untrackedReactive");
      } else if (trackedScope.expect === "function" && fn.async && !fn.generator) {
        const boundary = scopeStack.awaitBoundaries.get(fn);
        if (boundary === undefined) return;
        const readBefore = new Set(reads.filter((r) => r.start < boundary).map((r) => r.name));
        const seen = new Set<string>();
        for (const read of [...reads].sort((a, b) => a.start - b.start)) {
          if (read.start < boundary || readBefore.has(read.name) || seen.has(read.name)) continue;
          seen.add(read.name);
          report(read, "readAfterAwait");
        }
      }
    };

    const markAwait = (end: number) => {
      if (!v2 || !scopeStack.length) return;
      const scope = currentScope();
      if (scope.firstAwaitEnd === undefined || end < scope.firstAwaitEnd) scope.firstAwaitEnd = end;
    };

    // ---- Sync callback detection ----
    const checkForSyncCallbacks = (node: any) => {
      if (node.arguments.length === 1 && isFunctionNode(node.arguments[0]) && !node.arguments[0].async) {
        // Version 2: batch/produce are gone; flush(fn) runs fn in place, and isPending(fn)/latest(fn)
        // evaluate fn where they're called (MIGRATION §Initial loading vs in-flight changes).
        if (node.callee.type === "Identifier" && matchImport(v2 ? SYNC_V2 : ["batch", "produce"], node.callee.name)) {
          scopeStack.syncCallbacks.add(node.arguments[0]);
        } else if (
          node.callee.type === "MemberExpression" &&
          !node.callee.computed &&
          node.callee.object.type !== "ObjectExpression" &&
          /^(?:forEach|map|flatMap|reduce|reduceRight|find|findIndex|filter|every|some)$/.test(
            node.callee.property.name,
          )
        ) {
          scopeStack.syncCallbacks.add(node.arguments[0]);
        }
      }
      if (node.callee.type === "Identifier") {
        if (
          matchImport(v2 ? SETTER_SOURCES_V2 : ["createSignal", "createStore"], node.callee.name) &&
          node.parent?.type === "VariableDeclarator"
        ) {
          const setter = getNthDestructuredVar(node.parent.id, 1, context);
          if (setter) {
            for (const reference of setter.references) {
              const { identifier } = reference;
              if (!reference.init && reference.isRead() && identifier.parent?.type === "CallExpression") {
                for (const arg of identifier.parent.arguments) {
                  if (isFunctionNode(arg) && !arg.async) {
                    scopeStack.syncCallbacks.add(arg);
                  }
                }
              }
            }
          }
        } else if (
          matchImport(v2 ? ["mapArray", "repeat", "indexArray"] : ["mapArray", "indexArray"], node.callee.name)
        ) {
          const arg1 = node.arguments[1];
          if (isFunctionNode(arg1)) scopeStack.syncCallbacks.add(arg1);
        }
      }
      if (isFunctionNode(node.callee)) {
        scopeStack.syncCallbacks.add(node.callee);
      }
    };

    // ---- Reactive assignment detection ----
    const checkForReactiveAssignment = (id: ESTree.Node | null, init: ESTree.Node) => {
      init = ignoreTransparentWrappers(init);
      if (v2 && !usesRemovedApi(init)) return checkForReactiveAssignmentV2(id, init);
      if (init.type === "CallExpression" && init.callee.type === "Identifier") {
        const { callee } = init;
        if (matchImport(["createSignal", "useTransition"], callee.name)) {
          const signal = id && getNthDestructuredVar(id, 0, context);
          if (signal) {
            scopeStack.pushSignal(signal, currentScope().node);
          } else {
            warnShouldDestructure(id ?? init, "first");
          }
        } else if (matchImport(["createMemo", "createSelector"], callee.name)) {
          const memo = id && getReturnedVar(id, context);
          if (memo) {
            scopeStack.pushSignal(memo, currentScope().node);
          } else {
            warnShouldAssign(id ?? init);
          }
        } else if (matchImport("createStore", callee.name)) {
          const store = id && getNthDestructuredVar(id, 0, context);
          if (store) {
            scopeStack.pushProps(store, currentScope().node);
          } else {
            warnShouldDestructure(id ?? init, "first");
          }
        } else if (matchImport("mergeProps", callee.name)) {
          const merged = id && getReturnedVar(id, context);
          if (merged) {
            scopeStack.pushProps(merged, currentScope().node);
          } else {
            warnShouldAssign(id ?? init);
          }
        } else if (matchImport("splitProps", callee.name)) {
          if (id?.type === "ArrayPattern") {
            const vars = id.elements
              .map((_, i) => getNthDestructuredVar(id, i, context))
              .filter((v): v is Variable => Boolean(v));
            if (vars.length === 0) {
              warnShouldDestructure(id);
            } else {
              vars.forEach((v) => scopeStack.pushProps(v, currentScope().node));
            }
          } else {
            const v = id && getReturnedVar(id, context);
            if (v) scopeStack.pushProps(v, currentScope().node);
          }
        } else if (matchImport("createResource", callee.name)) {
          const resourceReturn = id && getNthDestructuredVar(id, 0, context);
          if (resourceReturn) scopeStack.pushProps(resourceReturn, currentScope().node);
        } else if (matchImport("createMutable", callee.name)) {
          const mutable = id && getReturnedVar(id, context);
          if (mutable) scopeStack.pushProps(mutable, currentScope().node);
        } else if (matchImport("mapArray", callee.name)) {
          const arg1 = init.arguments[1];
          const indexParam = isFunctionNode(arg1) ? arg1.params[1] : undefined;
          if (indexParam?.type === "Identifier") {
            const indexSignal = findVariable(context, indexParam);
            if (indexSignal) scopeStack.pushSignal(indexSignal);
          }
        } else if (matchImport("indexArray", callee.name)) {
          const arg1 = init.arguments[1];
          const valueParam = isFunctionNode(arg1) ? arg1.params[0] : undefined;
          if (valueParam?.type === "Identifier") {
            const valueSignal = findVariable(context, valueParam);
            if (valueSignal) scopeStack.pushSignal(valueSignal);
          }
        }
      }
    };

    // Version 2 (RFC 04, MIGRATION §New function forms): 2.0's reactive sources.
    const checkForReactiveAssignmentV2 = (id: ESTree.Node | null, init: ESTree.Node) => {
      if (init.type !== "CallExpression" || init.callee.type !== "Identifier") return;
      const { callee } = init;
      if (matchImport(["createSignal", "createOptimistic"], callee.name)) {
        const signal = id && getNthDestructuredVar(id, 0, context);
        if (signal) scopeStack.pushSignal(signal, currentScope().node);
        else warnShouldDestructure(id ?? init, "first");
      } else if (matchImport(["createMemo", "createDeferred"], callee.name)) {
        const memo = id && getReturnedVar(id, context);
        if (memo) scopeStack.pushSignal(memo, currentScope().node);
        else warnShouldAssign(id ?? init);
      } else if (matchImport(["createStore", "createOptimisticStore"], callee.name)) {
        const store = id && getNthDestructuredVar(id, 0, context);
        if (store) scopeStack.pushProps(store, currentScope().node);
        else warnShouldDestructure(id ?? init, "first");
      } else if (matchImport(["createProjection", "merge", "omit"], callee.name)) {
        const store = id && getReturnedVar(id, context);
        if (store) scopeStack.pushProps(store, currentScope().node);
        else warnShouldAssign(id ?? init);
      } else if (matchImport("mapArray", callee.name)) {
        // RFC 03 §List rendering: keyed (default) passes an index accessor, keyed: false an item
        // accessor, a key function both.
        const fn = init.arguments[1];
        if (!isFunctionNode(fn)) return;
        const mode = keyedOption(init.arguments[2]);
        const params = mode === "default" ? [1] : mode === false ? [0] : mode === "fn" ? [0, 1] : [];
        for (const i of params) {
          const param = fn.params[i];
          if (param?.type === "Identifier") {
            const variable = findVariable(context, param);
            if (variable) scopeStack.pushSignal(variable);
          }
        }
      }
    };

    // Version 2: a context provider is the context itself (MIGRATION §Context providers).
    const isProviderElement = (opening: ESTree.JSXOpeningElement): boolean => {
      const { name } = opening;
      if (name.type === "JSXMemberExpression") return name.property.name === "Provider";
      if (name.type !== "JSXIdentifier") return false;
      if (name.name.endsWith("Provider")) return true;
      const variable = findVariable(context, name as unknown as IdentifierNode);
      const decl = variable?.defs[0]?.node;
      return (
        decl?.type === "VariableDeclarator" &&
        decl.init?.type === "CallExpression" &&
        decl.init.callee.type === "Identifier" &&
        Boolean(matchImport("createContext", decl.init.callee.name))
      );
    };

    const usesRemovedApi = (call: ESTree.Node): boolean =>
      call.type === "CallExpression" &&
      call.callee.type === "Identifier" &&
      Boolean(matchImport(REMOVED_KNOWN_TO_V1, call.callee.name));

    // Version 2: Solid's control-flow components with function children.
    const isFlowElement = (node: ESTree.Node): boolean =>
      node.type === "JSXElement" &&
      node.openingElement.name.type === "JSXIdentifier" &&
      Boolean(matchImport(["For", "Show", "Match", "Repeat"], node.openingElement.name.name));

    // ---- Tracked scope detection ----
    const checkForTrackedScopes = (node: any) => {
      // allowAsync (version 2 only): computations that accept async functions (RFC 05).
      const pushTrackedScope = (n: ESTree.Node, expect: TrackedScope["expect"], allowAsync = false) => {
        currentScope().trackedScopes.push({ node: n, expect });
        if (
          expect !== "called-function" &&
          expect !== "apply" &&
          expect !== "untracked" &&
          !allowAsync &&
          isFunctionNode(n) &&
          n.async
        ) {
          context.report({ node: n, messageId: "noAsyncTrackedScope" });
        }
      };

      const permissivelyTrackNode = (n: ESTree.Node) => {
        walkTree(n, (childNode, skip) => {
          const traced = trace(childNode, context);
          if (
            isFunctionNode(traced) ||
            (traced?.type === "Identifier" &&
              traced.parent?.type !== "MemberExpression" &&
              !(traced.parent?.type === "CallExpression" && traced.parent.callee === traced))
          ) {
            pushTrackedScope(childNode, "called-function");
            skip();
          }
        });
      };

      const trackRunWithOwner = (arg0: any, arg1: any) => {
        if (arg1) {
          let isTrackedScope = true;
          const owner = arg0.type === "Identifier" && findVariable(context, arg0);
          if (owner) {
            const decl = owner.defs[0];
            if (
              decl?.node.type === "VariableDeclarator" &&
              decl.node.init?.type === "CallExpression" &&
              decl.node.init.callee.type === "Identifier" &&
              matchImport("getOwner", decl.node.init.callee.name)
            ) {
              const ownerFunction = findParent(decl.node, isProgramOrFunctionNode);
              const scopeStackIndex = scopeStack.findIndex(({ node }) => ownerFunction === node);
              if (
                (scopeStackIndex >= 1 &&
                  !scopeStack
                    .at(scopeStackIndex - 1)!
                    .trackedScopes.some((ts) => ts.expect === "function" && ts.node === ownerFunction)) ||
                scopeStackIndex === 0
              ) {
                isTrackedScope = false;
              }
            }
          }
          if (isTrackedScope) pushTrackedScope(arg1, "function");
        }
      };

      // ---- Version 2 (TASK-044): JSX expressions ----
      const trackJSXExpressionV2 = (node: any) => {
        const attr = node.parent?.type === "JSXAttribute" ? node.parent : null;
        const opening = attr?.parent?.type === "JSXOpeningElement" ? attr.parent : null;
        const attrName = attr ? context.sourceCode.getText(attr.name) : "";
        const isComponent = opening?.name.type === "JSXIdentifier" && !isDOMElementName(opening.name.name);
        const isNative = opening?.name.type === "JSXIdentifier" && isDOMElementName(opening.name.name);
        if (isNative && /^on[A-Z]/.test(attrName)) {
          // Only `on` + an uppercase letter is an event handler; a lowercase on* is an attribute
          // (MIGRATION §Attributes & events).
          pushTrackedScope(node.expression, "called-function");
        } else if (opening && attrName === "value" && isProviderElement(opening)) {
          // Provider value: read once (solid-js 2.0.3 createContext reads props.value once)
        } else if (isComponent && /^static[A-Z]/.test(attrName)) {
          // Static prop: do nothing
        } else if (attr && attrName === "ref") {
          // Ref callbacks are unowned and run once (MIGRATION §Ref callbacks); arrays compose them
          // (RFC 07 §Directives via ref).
          const expr = node.expression;
          if (isFunctionNode(expr)) {
            pushTrackedScope(expr, "called-function");
          } else {
            if (expr?.type === "ArrayExpression") {
              for (const el of expr.elements) if (isFunctionNode(el)) pushTrackedScope(el, "called-function");
            }
            pushTrackedScope(expr, "expression");
          }
        } else if (isJSXElementOrFragment(node.parent) && isFunctionNode(node.expression)) {
          // Control-flow callback bodies build structure: reads directly in them aren't tracked
          // (RFC 01 §Strict top-level access). Other render functions keep the 1.x treatment.
          pushTrackedScope(node.expression, isFlowElement(node.parent) ? "untracked" : "function");
        } else {
          pushTrackedScope(node.expression, "expression");
        }
      };

      // ---- Version 2 (TASK-044): calls ----
      const trackCallV2 = (node: any) => {
        const {
          callee,
          arguments: { 0: arg0, 1: arg1 },
        } = node;
        const name: string = callee.name;
        if (matchImport(["createEffect", "createRenderEffect"], name)) {
          // RFC 01 §Split tracking from effect: compute tracked (async allowed), apply untracked.
          pushTrackedScope(arg0, "function", true);
          if (isFunctionNode(arg1)) {
            pushTrackedScope(arg1, "apply");
          } else if (arg1?.type === "ObjectExpression") {
            // EffectBundle { effect, error } (RFC 01 §createEffect error handling).
            for (const property of arg1.properties) {
              if (property.type === "Property" && isFunctionNode(property.value)) {
                pushTrackedScope(property.value, "apply");
              }
            }
          } else if (arg1) {
            pushTrackedScope(arg1, "called-function");
          }
        } else if (matchImport(["createMemo", "createDeferred"], name)) {
          pushTrackedScope(arg0, "function", true);
        } else if (
          isFunctionNode(arg0) &&
          matchImport(
            ["createSignal", "createOptimistic", "createStore", "createOptimisticStore", "createProjection"],
            name,
          )
        ) {
          // MIGRATION §New function forms; RFC 04 §Derived stores.
          pushTrackedScope(arg0, "function", true);
        } else if (
          matchImport(["createTrackedEffect", "children", "untrack", "resolve", "until", "mapArray", "repeat"], name)
        ) {
          pushTrackedScope(arg0, "function");
        } else if (
          matchImport(["onSettled", "onFlush", "onCleanup", "action"], name) ||
          ["setInterval", "setTimeout", "setImmediate", "requestAnimationFrame", "requestIdleCallback"].includes(name)
        ) {
          // onSettled/onFlush reads aren't tracked (solid-js 2.0.3 signals.d.ts); actions are
          // imperative (RFC 06).
          pushTrackedScope(arg0, "called-function");
        } else if (matchImport("createStore", name) && arg0?.type === "ObjectExpression") {
          for (const property of arg0.properties) {
            if (property.type === "Property" && property.kind === "get" && isFunctionNode(property.value)) {
              pushTrackedScope(property.value, "function");
            }
          }
        } else if (matchImport("runWithOwner", name)) {
          trackRunWithOwner(arg0, arg1);
        } else if (/^(?:use|create)[A-Z]/.test(name) || getCustomReactiveFunctions().includes(name)) {
          for (const arg of node.arguments) {
            permissivelyTrackNode(arg);
          }
        }
      };

      if (v2 && node.type === "JSXExpressionContainer") {
        trackJSXExpressionV2(node);
      } else if (v2 && node.type === "CallExpression" && node.callee.type === "Identifier" && !usesRemovedApi(node)) {
        trackCallV2(node);
      } else if (node.type === "JSXExpressionContainer") {
        if (
          node.parent?.type === "JSXAttribute" &&
          context.sourceCode.getText(node.parent.name).startsWith("on") &&
          node.parent.parent?.type === "JSXOpeningElement" &&
          node.parent.parent.name.type === "JSXIdentifier" &&
          isDOMElementName(node.parent.parent.name.name)
        ) {
          pushTrackedScope(node.expression, "called-function");
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name.type === "JSXNamespacedName" &&
          node.parent.name.namespace.name === "use" &&
          isFunctionNode(node.expression)
        ) {
          pushTrackedScope(node.expression, "called-function");
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name.name === "value" &&
          node.parent.parent?.type === "JSXOpeningElement" &&
          ((node.parent.parent.name.type === "JSXIdentifier" && node.parent.parent.name.name.endsWith("Provider")) ||
            (node.parent.parent.name.type === "JSXMemberExpression" &&
              node.parent.parent.name.property.name === "Provider"))
        ) {
          // Provider value: do nothing
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name?.type === "JSXIdentifier" &&
          /^static[A-Z]/.test(node.parent.name.name) &&
          node.parent.parent?.type === "JSXOpeningElement" &&
          node.parent.parent.name.type === "JSXIdentifier" &&
          !isDOMElementName(node.parent.parent.name.name)
        ) {
          // Static prop: do nothing
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name.name === "ref" &&
          isFunctionNode(node.expression)
        ) {
          pushTrackedScope(node.expression, "called-function");
        } else if (isJSXElementOrFragment(node.parent) && isFunctionNode(node.expression)) {
          pushTrackedScope(node.expression, "function");
        } else {
          pushTrackedScope(node.expression, "expression");
        }
      } else if (node.type === "JSXSpreadAttribute") {
        pushTrackedScope(node.argument, "expression");
      } else if (node.type === "NewExpression") {
        const {
          callee,
          arguments: { 0: arg0 },
        } = node;
        if (
          callee.type === "Identifier" &&
          arg0 &&
          [
            "IntersectionObserver",
            "MutationObserver",
            "PerformanceObserver",
            "ReportingObserver",
            "ResizeObserver",
          ].includes(callee.name)
        ) {
          pushTrackedScope(arg0, "called-function");
        }
      } else if (node.type === "CallExpression") {
        if (node.callee.type === "Identifier") {
          const {
            callee,
            arguments: { 0: arg0, 1: arg1 },
          } = node;
          if (
            matchImport(
              [
                "createMemo",
                "children",
                "createEffect",
                "createRenderEffect",
                "createDeferred",
                "createComputed",
                "createSelector",
                "untrack",
                "mapArray",
                "indexArray",
                "observable",
              ],
              callee.name,
            ) ||
            (matchImport("createResource", callee.name) && node.arguments.length >= 2)
          ) {
            pushTrackedScope(arg0, "function");
          } else if (
            matchImport(["onMount", "onCleanup", "onError"], callee.name) ||
            ["setInterval", "setTimeout", "setImmediate", "requestAnimationFrame", "requestIdleCallback"].includes(
              callee.name,
            )
          ) {
            pushTrackedScope(arg0, "called-function");
          } else if (matchImport("on", callee.name)) {
            if (arg0) {
              if (arg0.type === "ArrayExpression") {
                arg0.elements.forEach((el: ESTree.Node | null) => {
                  if (el && el?.type !== "SpreadElement") pushTrackedScope(el, "function");
                });
              } else {
                pushTrackedScope(arg0, "function");
              }
            }
            if (arg1) pushTrackedScope(arg1, "called-function");
          } else if (matchImport("createStore", callee.name) && arg0?.type === "ObjectExpression") {
            for (const property of arg0.properties) {
              if (property.type === "Property" && property.kind === "get" && isFunctionNode(property.value)) {
                pushTrackedScope(property.value, "function");
              }
            }
          } else if (matchImport("runWithOwner", callee.name)) {
            trackRunWithOwner(arg0, arg1);
          } else if (/^(?:use|create)[A-Z]/.test(callee.name) || getCustomReactiveFunctions().includes(callee.name)) {
            for (const arg of node.arguments) {
              permissivelyTrackNode(arg);
            }
          }
        } else if (node.callee.type === "MemberExpression") {
          const { property } = node.callee;
          if (property.type === "Identifier" && property.name === "addEventListener" && node.arguments.length >= 2) {
            pushTrackedScope(node.arguments[1], "called-function");
          } else if (
            property.type === "Identifier" &&
            (/^(?:use|create)[A-Z]/.test(property.name) || getCustomReactiveFunctions().includes(property.name))
          ) {
            for (const arg of node.arguments) {
              permissivelyTrackNode(arg);
            }
          }
        }
      } else if (node.type === "VariableDeclarator") {
        if (node.init?.type === "CallExpression" && node.init.callee.type === "Identifier") {
          if (matchImport(["createReactive", "createReaction"], node.init.callee.name)) {
            const track = getReturnedVar(node.id, context);
            if (track) {
              for (const reference of track.references) {
                if (
                  !reference.init &&
                  reference.isReadOnly() &&
                  reference.identifier.parent?.type === "CallExpression" &&
                  reference.identifier.parent.callee === reference.identifier
                ) {
                  const a0 = reference.identifier.parent.arguments[0];
                  if (a0) pushTrackedScope(a0, "function");
                }
              }
            }
            if (isFunctionNode(node.init.arguments[0])) {
              pushTrackedScope(node.init.arguments[0], "called-function");
            }
          }
        }
      } else if (node.type === "AssignmentExpression") {
        if (
          node.left.type === "MemberExpression" &&
          node.left.property.type === "Identifier" &&
          isFunctionNode(node.right) &&
          /^on[a-z]+$/.test(node.left.property.name)
        ) {
          pushTrackedScope(node.right, "called-function");
        }
      } else if (node.type === "TaggedTemplateExpression") {
        for (const expression of node.quasi.expressions) {
          if (isFunctionNode(expression)) {
            pushTrackedScope(expression, "called-function");
            for (const param of expression.params) {
              if (param.type === "Identifier" && isPropsByName(param.name)) {
                const variable = findVariable(context, param);
                if (variable) scopeStack.pushProps(variable, currentScope().node);
              }
            }
          }
        }
      }
    };

    // ---- Visitors ----
    return {
      before() {
        scopeStack = new ScopeStack();
        currentScope = scopeStack.currentScope;
        parentScope = scopeStack.parentScope;
        v2 = readSolidVersion(context) === 2;
        imports = v2 ? importsV2 : importsV1;
        matchImport = imports.matchImport;
        importsV1.clear();
        importsV2.clear();
      },
      AwaitExpression(node) {
        markAwait(node.range[1]);
      },
      ForOfStatement(node) {
        // `for await`: the body runs after an await.
        if (node.await) markAwait(node.right.range[1]);
      },
      ImportDeclaration: handleImportDeclaration,
      JSXExpressionContainer(node) {
        checkForTrackedScopes(node);
      },
      JSXSpreadAttribute(node) {
        checkForTrackedScopes(node);
      },
      CallExpression(node) {
        checkForTrackedScopes(node);
        checkForSyncCallbacks(node);
        const parent = node.parent && ignoreTransparentWrappers(node.parent, true);
        if (parent?.type !== "AssignmentExpression" && parent?.type !== "VariableDeclarator") {
          checkForReactiveAssignment(null, node);
        }
      },
      NewExpression(node) {
        checkForTrackedScopes(node);
      },
      VariableDeclarator(node) {
        if (node.init) {
          checkForReactiveAssignment(node.id, node.init);
          checkForTrackedScopes(node);
        }
      },
      AssignmentExpression(node) {
        if (node.left.type !== "MemberExpression") {
          checkForReactiveAssignment(node.left, node.right);
        }
        checkForTrackedScopes(node);
      },
      TaggedTemplateExpression(node) {
        checkForTrackedScopes(node);
      },
      "JSXElement > JSXExpressionContainer > :function"(node) {
        if (
          isFunctionNode(node) &&
          node.parent?.type === "JSXExpressionContainer" &&
          node.parent.parent?.type === "JSXElement"
        ) {
          const element = node.parent.parent;
          if (
            v2 &&
            element.openingElement.name.type === "JSXIdentifier" &&
            !matchImport("Index", element.openingElement.name.name)
          ) {
            // RFC 03 §List rendering and §Conditionals; MIGRATION §Function children may receive accessors.
            const tagName = element.openingElement.name.name;
            const mode = keyedAttribute(element);
            let params: number[] = [];
            if (matchImport("For", tagName)) {
              params = mode === "default" || mode === true ? [1] : mode === false ? [0] : mode === "fn" ? [0, 1] : [];
            } else if (matchImport(["Show", "Match"], tagName)) {
              params = mode === "default" || mode === false ? [0] : [];
            }
            for (const i of params) {
              const param = node.params[i];
              if (param?.type === "Identifier") {
                const variable = findVariable(context, param);
                if (variable) scopeStack.pushSignal(variable, currentScope().node);
              }
            }
          } else if (element.openingElement.name.type === "JSXIdentifier") {
            const tagName = element.openingElement.name.name;
            const [first, second] = node.params;
            if (matchImport("For", tagName) && node.params.length === 2 && second?.type === "Identifier") {
              const index = findVariable(context, second);
              if (index) scopeStack.pushSignal(index, currentScope().node);
            } else if (matchImport("Index", tagName) && node.params.length >= 1 && first?.type === "Identifier") {
              const item = findVariable(context, first);
              if (item) scopeStack.pushSignal(item, currentScope().node);
            }
          }
        }
      },
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      FunctionDeclaration: onFunctionEnter,
      Program: onFunctionEnter,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      "FunctionDeclaration:exit": onFunctionExit,
      "Program:exit": onFunctionExit,
      JSXElement() {
        if (scopeStack.length) currentScope().hasJSX = true;
      },
      JSXFragment() {
        if (scopeStack.length) currentScope().hasJSX = true;
      },
    };
  },
});
