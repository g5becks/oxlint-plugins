import { defineRule, type ESTree } from "@oxlint/plugins";
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
 *   r instanceof C   (a native Error, or a set guard via Symbol.hasInstance)
 *   G(r) || H(r)     (both sides narrow, e.g. `e instanceof Error || isErr(e)`)
 * where G is a set guard (UserError), a kind guard (UserError.not_found) or isErr.
 * A variable declared with an error-set type (`(e: UserError) => …`, `e: A | B`) is always an
 * error, so accesses on it are never reported.
 *
 * Accessing these properties where the value is proven NOT to be an error (the else branch of
 * `if (G(r))`, or after `if (G(r)) return`) is still reported by default: without types the rule
 * can't tell the success value's own `.data` from a misplaced error access. Set
 * `allowOnSuccessValue: true` when success values have such properties (an HTTP body's `.data`).
 *
 * ❌ const result = getUser(id)
 *    console.log(result.data.id)   // result is User | UserError — crash if User
 *
 * ✅ const result = getUser(id)
 *    if (UserError(result)) { console.log(result.data.id) }
 */
import { sharedTrackerHandle } from "../utils/shared-tracker.ts";
import { readErrorsetSettings } from "../utils/settings.ts";
import { createNarrowing, type VariableKey } from "../utils/narrowing.ts";
import { ruleOptions } from "../utils/options.ts";

type IdentifierNode = Extract<ESTree.Node, { type: "Identifier" }>;
import { ERRORSET_PROPERTIES } from "../utils/pattern-helpers.ts";
import { mayImportConfiguredModule } from "../utils/early-exit.ts";

type Options = [{ properties?: string[]; allowOnSuccessValue?: boolean }?];

type TypeNode = Extract<ESTree.Node, { type: `TS${string}` }>;

/** Whether a type annotation names only error sets (`UserError`, `UserError | OrderError`). */
function namesOnlyErrorSets(type: TypeNode | null | undefined, guardNames: ReadonlySet<string>): boolean {
  if (!type) return false;
  if (type.type === "TSTypeReference") {
    return type.typeName.type === "Identifier" && !type.typeArguments && guardNames.has(type.typeName.name);
  }
  if (type.type === "TSUnionType") return type.types.every((member) => namesOnlyErrorSets(member, guardNames));
  return false;
}

/**
 * A variable or parameter declared with an error-set type (`(e: UserError) => …`) holds an error
 * wherever it is read, so its accesses are guarded by the type (a kind guard's false branch
 * leaves another kind of the same set).
 */
function declaredAsErrorSet(key: VariableKey, guardNames: ReadonlySet<string>): boolean {
  if (typeof key === "string") return false;
  return (
    key.defs.length > 0 &&
    key.defs.every((def) => {
      if (def.type !== "Parameter" && def.type !== "Variable") return false;
      const annotation = "typeAnnotation" in def.name ? def.name.typeAnnotation : undefined;
      return namesOnlyErrorSets(annotation?.typeAnnotation as TypeNode | undefined, guardNames);
    })
  );
}

export default defineRule({
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
          allowOnSuccessValue: {
            type: "boolean",
            description:
              "Don't report accesses where a guard proves the value is NOT an error (the else branch of `if (G(r))`, or after `if (G(r)) return`). Defaults to false.",
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
  createOnce(context) {
    // The file's import tracker, shared with the other errorset rules (audit R6).
    const tracker = sharedTrackerHandle();
    // Per file: candidate guard calls and property accesses, evaluated at Program:exit.
    const calls: Array<{ call: ESTree.CallExpression; subject: IdentifierNode }> = [];
    // `r instanceof Guard` uses: they make `r` a guarded variable like `Guard(r)`.
    const instanceofUses: Array<{ guard: string; subject: IdentifierNode }> = [];
    const accesses: Array<{ node: ESTree.MemberExpression; object: IdentifierNode; prop: string }> = [];

    const getTrackedProps = (opts: Options[0]): Set<string> => {
      if (opts?.properties && opts.properties.length > 0) {
        return new Set(opts.properties);
      }
      return ERRORSET_PROPERTIES;
    };

    return {
      before() {
        const settings = readErrorsetSettings(context);
        calls.length = 0;
        accesses.length = 0;
        instanceofUses.length = 0;
        // No import from a configured errorset module: nothing to report in this file (audit P3).
        if (!mayImportConfiguredModule(context.sourceCode.text, settings)) return false;
        tracker.acquire(settings);
        return true;
      },
      after() {
        tracker.release();
      },
      Program() {
        calls.length = 0;
        accesses.length = 0;
        instanceofUses.length = 0;
      },
      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);
      },
      VariableDeclaration(node) {
        tracker.handleVariableDeclaration(node);
      },
      CallExpression(node) {
        const subject = node.arguments[0];
        if (subject?.type === "Identifier") calls.push({ call: node, subject });
      },
      BinaryExpression(node) {
        if (node.operator !== "instanceof" || node.left.type !== "Identifier" || node.right.type !== "Identifier") {
          return;
        }
        instanceofUses.push({ guard: node.right.name, subject: node.left });
      },
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier" || node.object.type !== "Identifier") return;
        accesses.push({ node, object: node.object, prop: node.property.name });
      },
      "Program:exit"() {
        if (!tracker.hasErrorsetImport()) return;
        const narrowing = createNarrowing(context, tracker, { broad: true });

        // Variables that are the subject of any guard call in this file (any position).
        const guarded = new Set<VariableKey>();
        for (const { call, subject } of calls) {
          if (narrowing.isGuardLike(call)) guarded.add(narrowing.resolve(subject));
        }
        const guardNames = tracker.guardNames();
        for (const { guard, subject } of instanceofUses) {
          if (guardNames.has(guard)) guarded.add(narrowing.resolve(subject));
        }
        if (guarded.size === 0) return;

        const opts = ruleOptions<NonNullable<Options[0]>>(context);
        const trackedProps = getTrackedProps(opts);
        const allowOnSuccessValue = opts?.allowOnSuccessValue === true;
        for (const { node, object, prop } of accesses) {
          if (!trackedProps.has(prop)) continue;
          const key = narrowing.resolve(object);
          if (!guarded.has(key) || declaredAsErrorSet(key, guardNames) || narrowing.narrowingCall(node, key)) {
            continue;
          }
          if (allowOnSuccessValue && narrowing.successCall(node, key)) continue;
          context.report({
            node,
            messageId: "unguardedAccess",
            data: { prop, name: object.name },
          });
        }
      },
    };
  },
});
