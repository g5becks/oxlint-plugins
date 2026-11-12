import { defineRule } from "@oxlint/plugins";
export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Require readonly modifier on type literal properties.",
      recommended: "error",
    },
    schema: [],
    fixable: "code" as const,
    messages: {
      missingReadonly: "Property should have a readonly modifier.",
    },
  },
  createOnce(context) {
    return {
      TSTypeLiteral(node) {
        for (const member of node.members ?? []) {
          if (
            (member.type === "TSPropertySignature" || member.type === "TSIndexSignature") &&
            member.readonly !== true
          ) {
            context.report({
              node: member,
              messageId: "missingReadonly",
              fix(fixer) {
                return fixer.insertTextBefore(member, "readonly ");
              },
            });
          }
        }
      },
    };
  },
});
