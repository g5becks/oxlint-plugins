/**
 * Scope-aware narrowing of error-set values, shared by no-unguarded-data-access and
 * prefer-guard-over-manual-kind-check (audit R2, R4).
 *
 * A guard call is `UserError(r)` (set guard), `UserError.not_found(r)` (kind guard) or
 * `isErr(r)`. Narrowing forms, for an access on `r`:
 *   if (G(r)) { <here> }                 if (!G(r)) { ... } else { <here> }
 *   G(r) ? <here> : ...                  !G(r) ? ... : <here>
 *   G(r) && <here>                       !G(r) || <here>
 *   if (!G(r)) return | throw | continue | break;  <here, later in the block>
 * plus set checks (errorset >= 0.4 errors carry `set`): `r.set === "UserError"` narrows to that
 * set (`!==` is the negation). Merged guards (`merge(A, B)`, `A.merge(B)`) are set-level guards.
 */
import type { Context, ESTree, Variable } from "@oxlint/plugins";
import type { ErrorsetImportTracker } from "./detect-errorset-imports.ts";
import { isGuardCall, isIsErrCall } from "./pattern-helpers.ts";

/** A scope Variable, or a name key for identifiers that don't resolve (globals). */
export type VariableKey = Variable | string;

type Child = ESTree.Node | null | undefined;
type IdentifierNode = Extract<ESTree.Node, { type: "Identifier" }>;

function unwrap(node: Child): Child {
  let n = node;
  while (n && (n.type === "ParenthesizedExpression" || n.type === "ChainExpression")) n = n.expression;
  return n;
}

/** Whether a statement always leaves the enclosing block (return/throw/continue/break). */
function exits(stmt: Child): boolean {
  if (!stmt) return false;
  if (["ReturnStatement", "ThrowStatement", "ContinueStatement", "BreakStatement"].includes(stmt.type)) return true;
  if (stmt.type === "BlockStatement") return exits(stmt.body[stmt.body.length - 1]);
  return false;
}

/** Statement lists of block-like nodes (for guard clauses before the access). */
function statementList(node: ESTree.Node): ReadonlyArray<ESTree.Node> | undefined {
  if (node.type === "BlockStatement" || node.type === "Program" || node.type === "StaticBlock") return node.body;
  if (node.type === "SwitchCase") return node.consequent;
  return undefined;
}

/** `r.set === "Name"` (either side): returns { object, setName } or null. */
export function getSetEquality(node: Child): { object: ESTree.Node; setName: string; negated: boolean } | null {
  if (node?.type !== "BinaryExpression" || !["===", "==", "!==", "!="].includes(node.operator)) return null;
  const isSet = (n: ESTree.Node): n is ESTree.MemberExpression =>
    n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name === "set";
  const isStr = (n: ESTree.Node): n is ESTree.StringLiteral => n.type === "Literal" && typeof n.value === "string";
  let member: ESTree.MemberExpression;
  let literal: ESTree.StringLiteral;
  if (isSet(node.left) && isStr(node.right)) [member, literal] = [node.left, node.right];
  else if (isSet(node.right) && isStr(node.left)) [member, literal] = [node.right, node.left];
  else return null;
  return { object: member.object, setName: literal.value, negated: node.operator.startsWith("!") };
}

/**
 * The guard (local name) of the error set a narrowing node narrows to: `UserError` for
 * `UserError(r)` / `UserError.kind(r)` / `r.set === "UserError"`; null when the set is unknown
 * (isErr, merged guards, a set name without a known guard).
 */
export function guardSetName(node: Child, tracker: ErrorsetImportTracker): string | null {
  const guardNames = tracker.guardNames();
  const merged = tracker.mergedGuardNames();
  const setCheck = getSetEquality(node);
  if (setCheck) return tracker.guardForSetName(setCheck.setName);
  // Any node with a callee (calls and `new`), as before.
  const callee = node && "callee" in node ? node.callee : undefined;
  if (callee?.type === "Identifier" && guardNames.has(callee.name)) {
    return merged.has(callee.name) ? null : callee.name;
  }
  if (
    callee?.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    guardNames.has(callee.object.name)
  ) {
    return merged.has(callee.object.name) ? null : callee.object.name;
  }
  return null;
}

export interface Narrowing {
  /** The Variable an identifier refers to. */
  resolve(id: IdentifierNode): VariableKey;
  /** Whether `call` is a guard/isErr call (on any identifier). */
  isGuardLike(call: ESTree.Node): boolean;
  /** The guard call that narrows `key` at `node`, or null when it isn't narrowed. */
  narrowingCall(node: ESTree.Node, key: VariableKey): ESTree.Node | null;
}

/** The scope Variable an identifier refers to (or a name key for unresolved globals). */
export function resolveVariable(context: Context, id: IdentifierNode): VariableKey {
  let scope: ReturnType<Context["sourceCode"]["getScope"]> | null = context.sourceCode.getScope(id);
  while (scope) {
    const variable = scope.set?.get(id.name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return `global:${id.name}`;
}

export function createNarrowing(context: Context, tracker: ErrorsetImportTracker): Narrowing {
  const resolve = (id: IdentifierNode): VariableKey => resolveVariable(context, id);

  const isGuardLike = (call: ESTree.Node): boolean =>
    isGuardCall(call, tracker.guardNames(), tracker.mergedGuardNames()) ||
    isIsErrCall(call, (name) => tracker.isIsErrImport(name));

  const guardCallOn = (node: Child, key: VariableKey): ESTree.CallExpression | null => {
    const n = unwrap(node);
    if (n?.type !== "CallExpression") return null;
    const arg0 = n.arguments[0];
    if (arg0?.type !== "Identifier") return null;
    return isGuardLike(n) && resolve(arg0) === key ? n : null;
  };

  /** `r.set === "Name"` on the variable (negated: `!==`). */
  const setCheckOn = (node: ESTree.Node, key: VariableKey, negated: boolean): ESTree.Node | null => {
    const eq = getSetEquality(node);
    if (!eq || eq.negated !== negated || eq.object.type !== "Identifier") return null;
    return resolve(eq.object) === key ? node : null;
  };

  /**
   * `test` true implies the variable is an error-set value; returns the narrowing node (a guard
   * call or a set check). In `A && B`, B is checked first: it is evaluated later, so it is the
   * more specific narrowing (`ServiceError(r) && r.set === "DbError"`).
   */
  const positive = (test: Child, key: VariableKey): ESTree.Node | null => {
    const t = unwrap(test);
    if (!t) return null;
    const call = guardCallOn(t, key) ?? setCheckOn(t, key, false);
    if (call) return call;
    if (t.type === "LogicalExpression" && t.operator === "&&") {
      return positive(t.right, key) ?? positive(t.left, key);
    }
    return null;
  };

  /** `test` true implies the variable is NOT an error-set value; returns the guard call. */
  const negative = (test: Child, key: VariableKey): ESTree.Node | null => {
    const t = unwrap(test);
    if (!t) return null;
    if (t.type === "UnaryExpression" && t.operator === "!") return positive(t.argument, key);
    const setCheck = setCheckOn(t, key, true);
    if (setCheck) return setCheck;
    if (t.type === "LogicalExpression" && t.operator === "||") {
      const left = negative(t.left, key);
      return left && negative(t.right, key) ? left : null;
    }
    return null;
  };

  const narrowingCall = (node: ESTree.Node, key: VariableKey): ESTree.Node | null => {
    let child: ESTree.Node = node;
    let current: ESTree.Node | null = node.parent;
    while (current) {
      switch (current.type) {
        case "IfStatement":
        case "ConditionalExpression": {
          const call =
            child === current.consequent
              ? positive(current.test, key)
              : child === current.alternate
                ? negative(current.test, key)
                : null;
          if (call) return call;
          break;
        }
        case "LogicalExpression":
          if (child === current.right) {
            const call =
              current.operator === "&&"
                ? positive(current.left, key)
                : current.operator === "||"
                  ? negative(current.left, key)
                  : null;
            if (call) return call;
          }
          break;
        default: {
          const list = statementList(current);
          if (list) {
            for (const stmt of list) {
              if (stmt === child) break;
              if (stmt.type === "IfStatement" && !stmt.alternate && exits(stmt.consequent)) {
                const call = negative(stmt.test, key);
                if (call) return call;
              }
            }
          }
        }
      }
      child = current;
      current = current.parent;
    }
    return null;
  };

  return { resolve, isGuardLike, narrowingCall };
}
