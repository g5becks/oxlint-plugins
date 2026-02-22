function hasReadonlyWrapper(node: any): boolean {
  let current = node?.parent;
  while (current) {
    if (
      current.type === "TSTypeReference" &&
      current.typeName?.type === "Identifier" &&
      current.typeName.name === "Readonly"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

type RuleOptions = [{ ignoreIfReadonlyWrapped?: boolean }?];

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer property signatures over method signatures.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          ignoreIfReadonlyWrapped: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    fixable: "code",
    messages: {
      generic: "Use a property signature instead of a method signature.",
    },
  },
  defaultOptions: [{ ignoreIfReadonlyWrapped: false }] as RuleOptions,
  createOnce(context: any) {
    return {
      TSMethodSignature(node: any) {
        const ignoreIfReadonlyWrapped = context.options?.[0]?.ignoreIfReadonlyWrapped === true;
        if (ignoreIfReadonlyWrapped && hasReadonlyWrapper(node)) {
          return;
        }

        context.report({
          node,
          messageId: "generic",
          fix(fixer: any) {
            const sourceCode = context.sourceCode;
            const keyText = sourceCode.getText(node.key);
            const optional = node.optional ? "?" : "";
            const typeParams = node.typeParameters ? sourceCode.getText(node.typeParameters) : "";
            const params = node.params.map((param: any) => sourceCode.getText(param)).join(", ");
            const returnType = node.returnType ? sourceCode.getText(node.returnType.typeAnnotation) : "void";
            const replacement = `${keyText}${optional}: ${typeParams}(${params}) => ${returnType}`;
            return fixer.replaceText(node, replacement);
          },
        });
      },
    };
  },
};
