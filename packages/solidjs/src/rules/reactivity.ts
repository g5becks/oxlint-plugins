import { trackImports } from "../utils/imports";
import { isDOMElementName, isJSXElementOrFragment } from "../utils/jsx";
import { trace } from "../utils/trace";
import { findParent } from "../utils/traverse";

// ---- Inlined helpers ----

const isFunctionNode = (node: any): boolean =>
  !!node &&
  (node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression");

const isProgramOrFunctionNode = (node: any): boolean =>
  !!node && (node.type === "Program" || isFunctionNode(node));

const isPropsByName = (name: string): boolean => /[pP]rops/.test(name);

const getFunctionName = (node: any): string | null => {
  if (
    (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
    node.id != null
  ) {
    return node.id.name;
  }
  if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
};

function ignoreTransparentWrappers(node: any, up = false): any {
  if (
    node.type === "TSAsExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  ) {
    const next = up ? node.parent : node.expression;
    if (next) return ignoreTransparentWrappers(next, up);
  }
  return node;
}

function findInScope(node: any, scope: any, predicate: (n: any) => boolean): any {
  let current: any = node;
  while (current) {
    if (current === scope) return predicate(node) ? current : null;
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

function findVariable(context: any, node: any): any {
  const scope = context.sourceCode?.getScope?.(node);
  if (!scope) return null;
  // Walk up scopes to find variable
  let s = scope;
  while (s) {
    const v = s.set?.get?.(node.name);
    if (v) return v;
    s = s.upper;
  }
  return null;
}

function getFunctionHeadLoc(node: any, sourceCode: any): any {
  const parent = node.parent;
  if (node.type === "ArrowFunctionExpression") {
    const arrowToken = sourceCode.getTokenBefore(node.body, (t: any) => t.value === "=>");
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
  if (parent?.type === "VariableDeclarator" && parent.id?.loc) {
    return parent.id.loc;
  }
  return node.loc;
}

// Simple tree walker replacing estraverse
function walkTree(node: any, enter: (n: any, skip: () => void) => void): void {
  let skipped = false;
  const skipFn = () => { skipped = true; };
  enter(node, skipFn);
  if (skipped) return;
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (child && typeof child === "object") {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === "string") {
            walkTree(item, enter);
          }
        }
      } else if (typeof child.type === "string") {
        walkTree(child, enter);
      }
    }
  }
}

// ---- ScopeStack classes ----

interface ReactiveVariable {
  references: any[];
  declarationScope: any;
  variable: any;
}

interface TrackedScope {
  node: any;
  expect: "function" | "called-function" | "expression";
}

class ScopeStackItem {
  node: any;
  trackedScopes: TrackedScope[] = [];
  unnamedDerivedSignals = new Set<any>();
  hasJSX = false;
  constructor(node: any) { this.node = node; }
}

class ScopeStack {
  private items: ScopeStackItem[] = [];
  private signals: ReactiveVariable[] = [];
  private props: ReactiveVariable[] = [];
  syncCallbacks = new Set<any>();

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

  pushSignal(variable: any, declarationScope?: any) {
    if (!declarationScope) declarationScope = this.currentScope().node;
    this.signals.push({
      references: variable.references.filter((ref: any) => !ref.init),
      variable,
      declarationScope,
    });
  }

  pushUniqueSignal(variable: any, declarationScope: any) {
    const found = this.signals.find((s) => s.variable === variable);
    if (!found) {
      this.pushSignal(variable, declarationScope);
    } else {
      found.declarationScope = this.findDeepest(found.declarationScope, declarationScope);
    }
  }

  pushProps(variable: any, declarationScope?: any) {
    if (!declarationScope) declarationScope = this.currentScope().node;
    this.props.push({
      references: variable.references.filter((ref: any) => !ref.init),
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
    variables: ReactiveVariable[]
  ): Iterable<{ reference: any; declarationScope: any }> {
    for (const variable of variables) {
      const inScope: any[] = [];
      const notInScope: any[] = [];
      variable.references.forEach((ref: any) => {
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

  private findDeepest(a: any, b: any): any {
    if (a === b) return a;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const { node } = this.items[i]!;
      if (a === node || b === node) return node;
    }
    return a;
  }

  private isRefInCurrentScope(reference: any) {
    let parentFn = findParent(reference.identifier, isProgramOrFunctionNode);
    while (isFunctionNode(parentFn) && this.syncCallbacks.has(parentFn)) {
      parentFn = findParent(parentFn, isProgramOrFunctionNode);
    }
    return parentFn === this.currentScope().node;
  }
}

// ---- Helper functions ----

const getNthDestructuredVar = (id: any, n: number, context: any): any => {
  if (id?.type === "ArrayPattern") {
    const el = id.elements[n];
    if (el?.type === "Identifier") return findVariable(context, el);
  }
  return null;
};

const getReturnedVar = (id: any, context: any): any => {
  if (id.type === "Identifier") return findVariable(context, id);
  return null;
};

// ---- Rule export ----

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce that reactivity (props, signals, memos, etc.) is properly used, so changes in those values will be tracked and update the view as expected.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/reactivity.md",
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
      badSignal:
        "The reactive variable '{{name}}' should be called as a function when used in {{where}}.",
      badUnnamedDerivedSignal:
        "This function should be passed to a tracked scope (like createEffect) or an event handler because it contains reactivity, or else changes will be ignored.",
      shouldDestructure:
        "For proper analysis, array destructuring should be used to capture the {{nth}}result of this function call.",
      shouldAssign:
        "For proper analysis, a variable should be used to capture the result of this function call.",
      noAsyncTrackedScope:
        "This tracked scope should not be async. Solid's reactivity only tracks synchronously.",
    },
  },
  defaultOptions: [{ customReactiveFunctions: [] as string[] }],
  createOnce(context: any) {
    const getCustomReactiveFunctions = (): string[] =>
      context.options?.[0]?.customReactiveFunctions ?? [];

    const warnShouldDestructure = (node: any, nth?: string) =>
      context.report({
        node,
        messageId: "shouldDestructure",
        data: nth ? { nth: nth + " " } : undefined,
      });
    const warnShouldAssign = (node: any) =>
      context.report({ node, messageId: "shouldAssign" });

    const scopeStack = new ScopeStack();
    const { currentScope, parentScope } = scopeStack;
    const { matchImport, handleImportDeclaration } = trackImports();

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

    const matchTrackedScope = (trackedScope: TrackedScope, node: any): boolean => {
      switch (trackedScope.expect) {
        case "function":
        case "called-function":
          return node === trackedScope.node;
        case "expression":
          return Boolean(
            findInScope(node, currentScope().node, (n: any) => n === trackedScope.node)
          );
      }
    };

    const handleTrackedScopes = (identifier: any, declarationScope: any) => {
      const currentScopeNode = currentScope().node;
      if (
        !currentScope().trackedScopes.find((ts) => matchTrackedScope(ts, identifier))
      ) {
        const matchedExpression = currentScope().trackedScopes.find((ts) =>
          matchTrackedScope({ ...ts, expect: "expression" }, identifier)
        );
        if (declarationScope === currentScopeNode) {
          let parentMemberExpression: any = null;
          if (identifier.parent?.type === "MemberExpression") {
            parentMemberExpression = identifier.parent;
            while (parentMemberExpression?.parent?.type === "MemberExpression") {
              parentMemberExpression = parentMemberExpression.parent;
            }
          }
          const parentCallExpression =
            identifier.parent?.type === "CallExpression" ? identifier.parent : null;
          context.report({
            node: parentMemberExpression ?? parentCallExpression ?? identifier,
            messageId: matchedExpression ? "expectedFunctionGotExpression" : "untrackedReactive",
            data: {
              name: parentMemberExpression
                ? context.sourceCode.getText(parentMemberExpression)
                : identifier.name,
            },
          });
        } else {
          if (!parentScope() || !isFunctionNode(currentScopeNode)) return;

          const pushUnnamedDerivedSignal = () =>
            (parentScope().unnamedDerivedSignals ??= new Set()).add(currentScopeNode);

          if (currentScopeNode.type === "FunctionDeclaration") {
            const functionVariable =
              context.sourceCode.scopeManager?.getDeclaredVariables(currentScopeNode)?.[0];
            if (functionVariable) {
              scopeStack.pushUniqueSignal(functionVariable, declarationScope);
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentScopeNode.parent?.type === "VariableDeclarator") {
            const declarator = currentScopeNode.parent;
            const functionVariable =
              context.sourceCode.scopeManager?.getDeclaredVariables(declarator)?.[0];
            if (functionVariable) {
              scopeStack.pushUniqueSignal(functionVariable, declarationScope);
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentScopeNode.parent?.type === "Property") {
            // ignore for now
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
            (identifier.parent?.type === "ArrayExpression" &&
              identifier.parent.parent?.type === "CallExpression")
          ) {
            handleTrackedScopes(identifier, declarationScope);
          } else if (identifier.parent?.type === "TemplateLiteral") {
            reportBadSignal("template literals");
          } else if (
            identifier.parent?.type === "BinaryExpression" &&
            [
              "<", "<=", ">", ">=", "<<", ">>", ">>>",
              "+", "-", "*", "/", "%", "**", "|", "^", "&", "in",
            ].includes(identifier.parent.operator)
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
              (ts) =>
                ts.node === identifier &&
                (ts.expect === "function" || ts.expect === "called-function")
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
        } else if (
          identifier.parent?.type === "MemberExpression" &&
          identifier.parent.object === identifier
        ) {
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
          if (
            !currentScope().trackedScopes.find((ts) => matchTrackedScope(ts, node))
          ) {
            context.report({
              loc: getFunctionHeadLoc(node, context.sourceCode),
              messageId: "badUnnamedDerivedSignal",
            });
          }
        }
      }

      scopeStack.pop();
    };

    // ---- Sync callback detection ----
    const checkForSyncCallbacks = (node: any) => {
      if (
        node.arguments.length === 1 &&
        isFunctionNode(node.arguments[0]) &&
        !node.arguments[0].async
      ) {
        if (
          node.callee.type === "Identifier" &&
          matchImport(["batch", "produce"], node.callee.name)
        ) {
          scopeStack.syncCallbacks.add(node.arguments[0]);
        } else if (
          node.callee.type === "MemberExpression" &&
          !node.callee.computed &&
          node.callee.object.type !== "ObjectExpression" &&
          /^(?:forEach|map|flatMap|reduce|reduceRight|find|findIndex|filter|every|some)$/.test(
            node.callee.property.name
          )
        ) {
          scopeStack.syncCallbacks.add(node.arguments[0]);
        }
      }
      if (node.callee.type === "Identifier") {
        if (
          matchImport(["createSignal", "createStore"], node.callee.name) &&
          node.parent?.type === "VariableDeclarator"
        ) {
          const setter = getNthDestructuredVar(node.parent.id, 1, context);
          if (setter) {
            for (const reference of setter.references) {
              const { identifier } = reference;
              if (
                !reference.init &&
                reference.isRead() &&
                identifier.parent?.type === "CallExpression"
              ) {
                for (const arg of identifier.parent.arguments) {
                  if (isFunctionNode(arg) && !arg.async) {
                    scopeStack.syncCallbacks.add(arg);
                  }
                }
              }
            }
          }
        } else if (matchImport(["mapArray", "indexArray"], node.callee.name)) {
          const arg1 = node.arguments[1];
          if (isFunctionNode(arg1)) scopeStack.syncCallbacks.add(arg1);
        }
      }
      if (isFunctionNode(node.callee)) {
        scopeStack.syncCallbacks.add(node.callee);
      }
    };

    // ---- Reactive assignment detection ----
    const checkForReactiveAssignment = (id: any, init: any) => {
      init = ignoreTransparentWrappers(init);
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
              .map((_: any, i: number) => getNthDestructuredVar(id, i, context))
              .filter(Boolean);
            if (vars.length === 0) {
              warnShouldDestructure(id);
            } else {
              vars.forEach((v: any) => scopeStack.pushProps(v, currentScope().node));
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
          if (
            isFunctionNode(arg1) &&
            arg1.params.length >= 2 &&
            arg1.params[1].type === "Identifier"
          ) {
            const indexSignal = findVariable(context, arg1.params[1]);
            if (indexSignal) scopeStack.pushSignal(indexSignal);
          }
        } else if (matchImport("indexArray", callee.name)) {
          const arg1 = init.arguments[1];
          if (
            isFunctionNode(arg1) &&
            arg1.params.length >= 1 &&
            arg1.params[0].type === "Identifier"
          ) {
            const valueSignal = findVariable(context, arg1.params[0]);
            if (valueSignal) scopeStack.pushSignal(valueSignal);
          }
        }
      }
    };

    // ---- Tracked scope detection ----
    const checkForTrackedScopes = (node: any) => {
      const pushTrackedScope = (n: any, expect: TrackedScope["expect"]) => {
        currentScope().trackedScopes.push({ node: n, expect });
        if (expect !== "called-function" && isFunctionNode(n) && n.async) {
          context.report({ node: n, messageId: "noAsyncTrackedScope" });
        }
      };

      const permissivelyTrackNode = (n: any) => {
        walkTree(n, (childNode: any, skip: () => void) => {
          const traced = trace(childNode, context);
          if (
            isFunctionNode(traced) ||
            (traced.type === "Identifier" &&
              traced.parent?.type !== "MemberExpression" &&
              !(traced.parent?.type === "CallExpression" && traced.parent.callee === traced))
          ) {
            pushTrackedScope(childNode, "called-function");
            skip();
          }
        });
      };

      if (node.type === "JSXExpressionContainer") {
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
          ((node.parent.parent.name.type === "JSXIdentifier" &&
            node.parent.parent.name.name.endsWith("Provider")) ||
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
        const { callee, arguments: { 0: arg0 } } = node;
        if (
          callee.type === "Identifier" && arg0 &&
          ["IntersectionObserver", "MutationObserver", "PerformanceObserver",
            "ReportingObserver", "ResizeObserver"].includes(callee.name)
        ) {
          pushTrackedScope(arg0, "called-function");
        }
      } else if (node.type === "CallExpression") {
        if (node.callee.type === "Identifier") {
          const { callee, arguments: { 0: arg0, 1: arg1 } } = node;
          if (
            matchImport(
              ["createMemo", "children", "createEffect", "createRenderEffect",
                "createDeferred", "createComputed", "createSelector", "untrack",
                "mapArray", "indexArray", "observable"],
              callee.name
            ) ||
            (matchImport("createResource", callee.name) && node.arguments.length >= 2)
          ) {
            pushTrackedScope(arg0, "function");
          } else if (
            matchImport(["onMount", "onCleanup", "onError"], callee.name) ||
            ["setInterval", "setTimeout", "setImmediate",
              "requestAnimationFrame", "requestIdleCallback"].includes(callee.name)
          ) {
            pushTrackedScope(arg0, "called-function");
          } else if (matchImport("on", callee.name)) {
            if (arg0) {
              if (arg0.type === "ArrayExpression") {
                arg0.elements.forEach((el: any) => {
                  if (el && el?.type !== "SpreadElement") pushTrackedScope(el, "function");
                });
              } else {
                pushTrackedScope(arg0, "function");
              }
            }
            if (arg1) pushTrackedScope(arg1, "called-function");
          } else if (matchImport("createStore", callee.name) && arg0?.type === "ObjectExpression") {
            for (const property of arg0.properties) {
              if (
                property.type === "Property" &&
                property.kind === "get" &&
                isFunctionNode(property.value)
              ) {
                pushTrackedScope(property.value, "function");
              }
            }
          } else if (matchImport("runWithOwner", callee.name)) {
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
                  const scopeStackIndex = scopeStack.findIndex(({ node }: any) => ownerFunction === node);
                  if (
                    (scopeStackIndex >= 1 &&
                      !scopeStack.at(scopeStackIndex - 1)!.trackedScopes.some(
                        (ts: any) => ts.expect === "function" && ts.node === ownerFunction
                      )) ||
                    scopeStackIndex === 0
                  ) {
                    isTrackedScope = false;
                  }
                }
              }
              if (isTrackedScope) pushTrackedScope(arg1, "function");
            }
          } else if (
            /^(?:use|create)[A-Z]/.test(callee.name) ||
            getCustomReactiveFunctions().includes(callee.name)
          ) {
            for (const arg of node.arguments) {
              permissivelyTrackNode(arg);
            }
          }
        } else if (node.callee.type === "MemberExpression") {
          const { property } = node.callee;
          if (
            property.type === "Identifier" &&
            property.name === "addEventListener" &&
            node.arguments.length >= 2
          ) {
            pushTrackedScope(node.arguments[1], "called-function");
          } else if (
            property.type === "Identifier" &&
            (/^(?:use|create)[A-Z]/.test(property.name) ||
              getCustomReactiveFunctions().includes(property.name))
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
      ImportDeclaration: handleImportDeclaration,
      JSXExpressionContainer(node: any) { checkForTrackedScopes(node); },
      JSXSpreadAttribute(node: any) { checkForTrackedScopes(node); },
      CallExpression(node: any) {
        checkForTrackedScopes(node);
        checkForSyncCallbacks(node);
        const parent = node.parent && ignoreTransparentWrappers(node.parent, true);
        if (parent?.type !== "AssignmentExpression" && parent?.type !== "VariableDeclarator") {
          checkForReactiveAssignment(null, node);
        }
      },
      NewExpression(node: any) { checkForTrackedScopes(node); },
      VariableDeclarator(node: any) {
        if (node.init) {
          checkForReactiveAssignment(node.id, node.init);
          checkForTrackedScopes(node);
        }
      },
      AssignmentExpression(node: any) {
        if (node.left.type !== "MemberExpression") {
          checkForReactiveAssignment(node.left, node.right);
        }
        checkForTrackedScopes(node);
      },
      TaggedTemplateExpression(node: any) { checkForTrackedScopes(node); },
      "JSXElement > JSXExpressionContainer > :function"(node: any) {
        if (
          isFunctionNode(node) &&
          node.parent?.type === "JSXExpressionContainer" &&
          node.parent.parent?.type === "JSXElement"
        ) {
          const element = node.parent.parent;
          if (element.openingElement.name.type === "JSXIdentifier") {
            const tagName = element.openingElement.name.name;
            if (
              matchImport("For", tagName) &&
              node.params.length === 2 &&
              node.params[1].type === "Identifier"
            ) {
              const index = findVariable(context, node.params[1]);
              if (index) scopeStack.pushSignal(index, currentScope().node);
            } else if (
              matchImport("Index", tagName) &&
              node.params.length >= 1 &&
              node.params[0].type === "Identifier"
            ) {
              const item = findVariable(context, node.params[0]);
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
};
