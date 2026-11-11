import { isInForLoopInitializer } from "../utils/tree";

type RuleOptions = [{ allowInForLoopInit?: boolean }?];

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow mutable variables declared with let.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInForLoopInit: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      generic: "Unexpected let, use const instead.",
    },
  },
  defaultOptions: [{ allowInForLoopInit: false }] as RuleOptions,
  createOnce(context: any) {
    return {
      VariableDeclaration(node: any) {
        if (node.kind !== "let") {
          return;
        }
        const allowInForLoopInit = context.options?.[0]?.allowInForLoopInit === true;
        if (allowInForLoopInit && isInForLoopInitializer(node)) {
          return;
        }
        context.report({ node, messageId: "generic" });
      },
    };
  },
};
