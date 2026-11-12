import { defineRule } from "@oxlint/plugins";
import { getEnclosingFunction } from "../utils/tree.ts";
import { ruleOptions } from "../utils/options.ts";

type RuleOptions = [{ allowInAsyncFunctions?: boolean }?];

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Disallow throw statements.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInAsyncFunctions: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      generic: "Unexpected throw, throwing exceptions is not functional.",
    },
    defaultOptions: [{ allowInAsyncFunctions: false }],
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        const allowInAsyncFunctions = ruleOptions<NonNullable<RuleOptions[0]>>(context)?.allowInAsyncFunctions === true;
        if (allowInAsyncFunctions) {
          const fn = getEnclosingFunction(node);
          if (fn?.async === true) {
            return;
          }
        }

        context.report({ node, messageId: "generic" });
      },
    };
  },
});
