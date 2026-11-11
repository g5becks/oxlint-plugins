function isAllowedTypeAnnotation(typeAnnotation: any): boolean {
  // `as unknown` and `<unknown>` are allowed
  if (typeAnnotation.type === "TSUnknownKeyword") {
    return true;
  }
  // `as const` and `<const>` are:
  //   - TSTypeOperator with operator "const" in the oxlint runtime parser
  //   - TSTypeReference with typeName.name "const" in @typescript-eslint/parser (used in tests)
  // Accept both so the rule works identically in both environments.
  if (typeAnnotation.type === "TSTypeOperator" && typeAnnotation.operator === "const") {
    return true;
  }
  if (
    typeAnnotation.type === "TSTypeReference" &&
    typeAnnotation.typeName?.type === "Identifier" &&
    typeAnnotation.typeName?.name === "const"
  ) {
    return true;
  }
  return false;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow type assertions in TypeScript code.",
      recommended: "error",
    },
    messages: {
      angleBracketAssertion: "Do not use type assertion",
      asAssertion: "Do not use `as` operator for type assertion",
      nonNullAssertion: "Do not use non-null assertion operator",
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: any) {
    return {
      // Angle-bracket syntax: <Type>value
      TSTypeAssertion(node: any) {
        if (isAllowedTypeAnnotation(node.typeAnnotation)) {
          return;
        }
        context.report({ node, messageId: "angleBracketAssertion" });
      },

      // As-operator syntax: value as Type
      TSAsExpression(node: any) {
        if (isAllowedTypeAnnotation(node.typeAnnotation)) {
          return;
        }
        context.report({ node, messageId: "asAssertion" });
      },

      // Non-null assertion: value!
      TSNonNullExpression(node: any) {
        context.report({ node, messageId: "nonNullAssertion" });
      },
    };
  },
};
