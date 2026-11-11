/**
 * Rule: no-catch-errorset
 *
 * Disallows applying errorset guards to a caught value.
 * Errorset values are returned values — they are never thrown, so they can
 * never arrive in a catch clause. Only the caught value (and variables assigned
 * directly from it) is checked; guards on other values in a catch block are fine.
 *
 * ❌ catch (e) { if (isErr(e)) { ... } }
 * ❌ catch (e) { if (UserError(e)) { ... } }
 * ❌ catch (e) { if (e instanceof UserError) { ... } }
 * ❌ catch (e) { if (e.kind === "not_found") { ... } }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts";
import { readErrorsetSettings } from "../utils/settings.ts";
import { resolveVariable } from "../utils/narrowing.ts";
import { isGuardCall, isErrorsetInstanceof, isIsErrCall } from "../utils/pattern-helpers.ts";

const PATTERN_TYPES = new Set(["ObjectPattern", "ArrayPattern", "Property", "AssignmentPattern", "RestElement"]);

/** Whether a declared identifier is (part of) a catch clause parameter. */
function isCatchParamIdentifier(id: any): boolean {
  let child = id;
  let current = id?.parent;
  while (current && PATTERN_TYPES.has(current.type)) {
    child = current;
    current = current.parent;
  }
  return current?.type === "CatchClause" && current.param === child;
}

/**
 * Whether `id` refers to the caught value (audit R5): the catch parameter, an identifier
 * bound by a destructured catch parameter, or a variable initialized directly from one of
 * those (`const err = e`, transitively). Anything else in a catch block, such as the result
 * of a fallback call, may legitimately be an errorset value.
 */
function isCaughtValue(context: any, id: any, depth = 0): boolean {
  if (id?.type !== "Identifier" || depth > 8) return false;
  const variable = resolveVariable(context, id);
  if (typeof variable === "string") return false;
  const v = variable as { defs?: any[]; identifiers?: any[] };
  if (v.defs?.some((d) => d?.type === "CatchClause")) return true;
  for (const declared of v.identifiers ?? []) {
    if (isCatchParamIdentifier(declared)) return true;
    const declarator = declared.parent;
    if (
      declarator?.type === "VariableDeclarator" &&
      declarator.id === declared &&
      declarator.init?.type === "Identifier"
    ) {
      if (isCaughtValue(context, declarator.init, depth + 1)) return true;
    }
  }
  return false;
}

export default {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow using errorset guards inside catch blocks. Errorset values are returned, not thrown, so they can never be caught.",
      recommended: "error",
    },
    fixable: undefined,
    schema: [],
    messages: {
      isErrInCatch:
        "`isErr()` inside a catch block will never match. Errorset values are returned, not thrown. Check the function's return value directly.",
      guardInCatch:
        "`{{name}}(...)` inside a catch block will never match. Errorset values are returned, not thrown. Check the function's return value directly.",
      instanceofInCatch:
        "`instanceof {{name}}` inside a catch block will never match. Errorset values are returned, not thrown. Check the function's return value directly.",
      kindInCatch:
        "Accessing `.kind` on a caught error expecting an errorset is always wrong. Errorset values are returned, not thrown.",
    },
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = createErrorsetImportTracker();

    return {
      before() {
        tracker.reset(readErrorsetSettings(context));
      },
      Program() {
        tracker.reset(readErrorsetSettings(context));
      },
      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);
      },
      VariableDeclaration(node: any) {
        tracker.handleVariableDeclaration(node);
      },
      CallExpression(node: any) {
        if (!tracker.hasErrorsetImport()) return;
        if (!isCaughtValue(context, node.arguments?.[0])) return;

        // isErr(e)
        if (isIsErrCall(node, (n) => tracker.isIsErrImport(n))) {
          context.report({ node, messageId: "isErrInCatch" });
          return;
        }

        // UserError(e) or UserError.kind(e)
        const guardNames = tracker.guardNames();
        if (guardNames.size === 0) return;

        if (isGuardCall(node, guardNames)) {
          const callee = node.callee;
          const name = callee?.type === "Identifier" ? callee.name : (callee?.object?.name ?? "ErrorSet");
          context.report({ node, messageId: "guardInCatch", data: { name } });
        }
      },
      BinaryExpression(node: any) {
        if (!tracker.hasErrorsetImport()) return;
        if (node.operator !== "instanceof" || !isCaughtValue(context, node.left)) return;

        const guardNames = tracker.guardNames();

        // value instanceof UserError
        if (isErrorsetInstanceof(node, guardNames)) {
          const name = node.right?.name ?? "ErrorSet";
          context.report({ node, messageId: "instanceofInCatch", data: { name } });
        }
      },
      MemberExpression(node: any) {
        // catch (e) { ... e.kind ... }
        if (!tracker.hasErrorsetImport()) return;
        if (node.property?.type !== "Identifier" || node.property.name !== "kind") return;
        if (isCaughtValue(context, node.object)) {
          context.report({ node, messageId: "kindInCatch" });
        }
      },
    };
  },
};
