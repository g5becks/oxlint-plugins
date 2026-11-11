export default {
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
  defaultOptions: [],
  createOnce(context: any) {
    return {
      TSTypeLiteral(node: any) {
        for (const member of node.members ?? []) {
          if (
            (member.type === "TSPropertySignature" || member.type === "TSIndexSignature") &&
            member.readonly !== true
          ) {
            context.report({
              node: member,
              messageId: "missingReadonly",
              fix(fixer: any) {
                return fixer.insertTextBefore(member, "readonly ");
              },
            });
          }
        }
      },
    };
  },
};
