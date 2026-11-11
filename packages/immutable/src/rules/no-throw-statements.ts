import { getEnclosingFunction } from "../utils/tree";

type RuleOptions = [{ allowInAsyncFunctions?: boolean }?];

export default {
  meta: {
    type: "suggestion",
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
  },
  defaultOptions: [{ allowInAsyncFunctions: false }] as RuleOptions,
  createOnce(context: any) {
    return {
      ThrowStatement(node: any) {
        const allowInAsyncFunctions = context.options?.[0]?.allowInAsyncFunctions === true;
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
};
