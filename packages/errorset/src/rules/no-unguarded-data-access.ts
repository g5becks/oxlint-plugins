/**
 * Rule: no-unguarded-data-access
 *
 * Warns when `.data`, `.kind`, `.message`, or `.cause` is accessed on a variable
 * that is the subject of an errorset guard in an ancestor scope WITHOUT first
 * narrowing via the guard.
 *
 * Conservative: it only reports accesses on a variable that is passed to an isErr()/guard
 * call somewhere in the file, resolved through scope analysis (a same-named variable in
 * another function is a different variable). Results don't depend on traversal order:
 * everything is collected first and evaluated at Program:exit.
 *
 * Narrowing forms understood (audit R2):
 *   if (G(r)) { r.data }                      if (!G(r)) { ... } else { r.data }
 *   G(r) ? r.data : ...                       !G(r) ? ... : r.data
 *   G(r) && r.data                            !G(r) || r.data
 *   if (!G(r)) return | throw | continue | break;   r.data   (guard clause)
 * where G is a set guard (UserError), a kind guard (UserError.not_found) or isErr.
 *
 * ❌ const result = getUser(id)
 *    console.log(result.data.id)   // result is User | UserError — crash if User
 *
 * ✅ const result = getUser(id)
 *    if (UserError(result)) { console.log(result.data.id) }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts";
import { readErrorsetSettings } from "../utils/settings.ts";
import { isGuardCall, isIsErrCall, ERRORSET_PROPERTIES } from "../utils/pattern-helpers.ts";

type Options = [{ properties?: string[] }?];

type VariableKey = object | string;

function unwrap(node: any): any {
  let n = node;
  while (n && (n.type === "ParenthesizedExpression" || n.type === "ChainExpression")) n = n.expression;
  return n;
}

/** Whether a statement always leaves the enclosing block (return/throw/continue/break). */
function exits(stmt: any): boolean {
  if (!stmt) return false;
  if (["ReturnStatement", "ThrowStatement", "ContinueStatement", "BreakStatement"].includes(stmt.type)) return true;
  if (stmt.type === "BlockStatement") return exits(stmt.body?.[stmt.body.length - 1]);
  return false;
}

/** Statement lists of block-like nodes (for guard clauses before the access). */
function statementList(node: any): any[] | undefined {
  if (node.type === "BlockStatement" || node.type === "Program" || node.type === "StaticBlock") return node.body;
  if (node.type === "SwitchCase") return node.consequent;
  return undefined;
}
export default {
  meta: {
    type: "suggestion" as const,
    docs: {
      description:
        "Warn when errorset-related properties (.data, .kind, .message, .cause) are accessed without first narrowing the value via a guard.",
      recommended: "warn",
    },
    fixable: undefined,
    schema: [
      {
        type: "object",
        properties: {
          properties: {
            type: "array",
            items: { type: "string" },
            description: 'Which errorset properties to check. Defaults to ["data", "kind", "message", "cause"].',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unguardedAccess:
        "Accessing `.{{prop}}` on `{{name}}` without a guard check. Use `if (SomeError({{name}}))` or `if (isErr({{name}}))` before accessing errorset properties.",
    },
  },
  defaultOptions: [{}] as Options,
  createOnce(context: any) {
    const tracker = createErrorsetImportTracker();
    // Per file: candidate guard calls and property accesses, evaluated at Program:exit.
    const calls: any[] = [];
    const accesses: any[] = [];

    const getTrackedProps = (): Set<string> => {
      const opts = context.options?.[0] as Options[0];
      if (opts?.properties && opts.properties.length > 0) {
        return new Set(opts.properties);
      }
      return ERRORSET_PROPERTIES;
    };

    /** The scope Variable an identifier refers to (or a name key for unresolved globals). */
    const resolve = (id: any): VariableKey => {
      let scope = context.sourceCode.getScope(id);
      while (scope) {
        const variable = scope.set?.get(id.name);
        if (variable) return variable;
        scope = scope.upper;
      }
      return `global:${id.name}`;
    };

    const isGuardCallOn = (node: any, key: VariableKey): boolean => {
      const n = unwrap(node);
      if (n?.type !== "CallExpression") return false;
      const arg0 = n.arguments?.[0];
      if (arg0?.type !== "Identifier") return false;
      const isGuard =
        isGuardCall(n, tracker.guardNames()) || isIsErrCall(n, (name: string) => tracker.isIsErrImport(name));
      return isGuard && resolve(arg0) === key;
    };

    /** `test` true implies the variable is an error-set value. */
    const positive = (test: any, key: VariableKey): boolean => {
      const t = unwrap(test);
      if (!t) return false;
      if (isGuardCallOn(t, key)) return true;
      if (t.type === "LogicalExpression" && t.operator === "&&") {
        return positive(t.left, key) || positive(t.right, key);
      }
      return false;
    };

    /** `test` true implies the variable is NOT an error-set value (so false implies it is). */
    const negative = (test: any, key: VariableKey): boolean => {
      const t = unwrap(test);
      if (!t) return false;
      if (t.type === "UnaryExpression" && t.operator === "!") return positive(t.argument, key);
      if (t.type === "LogicalExpression" && t.operator === "||") {
        return negative(t.left, key) && negative(t.right, key);
      }
      return false;
    };

    const isNarrowed = (access: any, key: VariableKey): boolean => {
      let child = access;
      let current = access.parent;
      while (current) {
        switch (current.type) {
          case "IfStatement":
          case "ConditionalExpression":
            if (child === current.consequent && positive(current.test, key)) return true;
            if (child === current.alternate && negative(current.test, key)) return true;
            break;
          case "LogicalExpression":
            if (child === current.right) {
              if (current.operator === "&&" && positive(current.left, key)) return true;
              if (current.operator === "||" && negative(current.left, key)) return true;
            }
            break;
          default: {
            const list = statementList(current);
            if (list) {
              for (const stmt of list) {
                if (stmt === child) break;
                if (
                  stmt.type === "IfStatement" &&
                  !stmt.alternate &&
                  negative(stmt.test, key) &&
                  exits(stmt.consequent)
                ) {
                  return true;
                }
              }
            }
          }
        }
        child = current;
        current = current.parent;
      }
      return false;
    };

    return {
      before() {
        tracker.reset(readErrorsetSettings(context));
        calls.length = 0;
        accesses.length = 0;
      },
      Program() {
        tracker.reset(readErrorsetSettings(context));
        calls.length = 0;
        accesses.length = 0;
      },
      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);
      },
      VariableDeclaration(node: any) {
        tracker.handleVariableDeclaration(node);
      },
      CallExpression(node: any) {
        if (node.arguments?.[0]?.type === "Identifier") calls.push(node);
      },
      MemberExpression(node: any) {
        if (node.computed || node.property?.type !== "Identifier" || node.object?.type !== "Identifier") return;
        accesses.push(node);
      },
      "Program:exit"() {
        if (!tracker.hasErrorsetImport()) return;
        const guardNames = tracker.guardNames();
        const isIsErrName = (name: string) => tracker.isIsErrImport(name);

        // Variables that are the subject of any guard call in this file (any position).
        const guarded = new Set<VariableKey>();
        for (const call of calls) {
          if (isGuardCall(call, guardNames) || isIsErrCall(call, isIsErrName)) guarded.add(resolve(call.arguments[0]));
        }
        if (guarded.size === 0) return;

        const trackedProps = getTrackedProps();
        for (const node of accesses) {
          if (!trackedProps.has(node.property.name)) continue;
          const key = resolve(node.object);
          if (!guarded.has(key) || isNarrowed(node, key)) continue;
          context.report({
            node,
            messageId: "unguardedAccess",
            data: { prop: node.property.name, name: node.object.name },
          });
        }
      },
    };
  },
};
