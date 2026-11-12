import { defineRule } from "@oxlint/plugins";
/**
 * Rule: prefer-guard-over-manual-kind-check
 *
 * Warns when `.kind === "literal"` is used to check an errorset value
 * instead of the kind-level guard function `SomeError.kind(value)`.
 * Manual kind checks lose TypeScript's type narrowing for `.data`.
 *
 * ❌ if (result.kind === "not_found") { result.data.id }  // data is Record<string, unknown>
 * ✅ if (UserError.not_found(result)) { result.data.id }  // data is { id: string }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts";
import { readErrorsetSettings } from "../utils/settings.ts";
import { createNarrowing, guardSetName } from "../utils/narrowing.ts";
import { getKindEquality } from "../utils/pattern-helpers.ts";
import { mayImportConfiguredModule } from "../utils/early-exit.ts";

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description:
        'Prefer errorset kind-level guard functions over manual `.kind === "..."` checks. Guards provide TypeScript type narrowing for `.data`.',
      recommended: "warn",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      preferGuard:
        'Use the kind-level guard `{{guardName}}.{{kind}}({{varName}})` instead of `{{varName}}.kind === "{{kind}}"`.',
      preferGuardUnknown:
        'Use a kind-level guard instead of `.kind === "{{kindLiteral}}"`. Manual kind checks don\'t provide TypeScript type narrowing for `.data`.',
    },
  },
  createOnce(context) {
    const tracker = createErrorsetImportTracker();

    return {
      before() {
        const settings = readErrorsetSettings(context);
        tracker.reset(settings);
        // No import from a configured errorset module: nothing to report in this file (audit P3).
        return mayImportConfiguredModule(context.sourceCode.text, settings);
      },
      Program() {
        tracker.reset(readErrorsetSettings(context));
      },
      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);
      },
      VariableDeclaration(node) {
        tracker.handleVariableDeclaration(node);
      },
      BinaryExpression(node) {
        if (!tracker.hasErrorsetImport()) return;

        const equality = getKindEquality(node);
        if (!equality) return;

        const { object, kindLiteral } = equality;
        if (object?.type !== "Identifier") return;

        // Only report when a guard already narrowed the variable to an error (conservative).
        // The suggestion uses that guard's set (audit R4), or the set of an `r.set === "Name"`
        // check; isErr() and merged guards don't identify a set, so no suggestion then.
        const narrowing = createNarrowing(context, tracker);
        const call = narrowing.narrowingCall(node, narrowing.resolve(object));
        if (!call) return;

        const guardName = guardSetName(call, tracker);
        const varName = object.name;
        if (guardName) {
          const sourceCode = context.sourceCode;
          context.report({
            node,
            messageId: "preferGuard",
            data: { guardName, kind: kindLiteral, varName },
            suggest: [
              {
                messageId: "preferGuard",
                data: { guardName, kind: kindLiteral, varName },
                fix(fixer) {
                  return fixer.replaceText(node, `${guardName}.${kindLiteral}(${sourceCode.getText(object)})`);
                },
              },
            ],
          });
        } else {
          context.report({
            node,
            messageId: "preferGuardUnknown",
            data: { kindLiteral },
          });
        }
      },
    };
  },
});
