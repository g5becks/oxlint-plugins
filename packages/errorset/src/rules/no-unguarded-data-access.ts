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
import { createNarrowing } from "../utils/narrowing.ts";
import { ERRORSET_PROPERTIES } from "../utils/pattern-helpers.ts";

type Options = [{ properties?: string[] }?];

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
        const narrowing = createNarrowing(context, tracker);

        // Variables that are the subject of any guard call in this file (any position).
        const guarded = new Set<object | string>();
        for (const call of calls) {
          if (narrowing.isGuardLike(call)) guarded.add(narrowing.resolve(call.arguments[0]));
        }
        if (guarded.size === 0) return;

        const trackedProps = getTrackedProps();
        for (const node of accesses) {
          if (!trackedProps.has(node.property.name)) continue;
          const key = narrowing.resolve(node.object);
          if (!guarded.has(key) || narrowing.narrowingCall(node, key)) continue;
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
