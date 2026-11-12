import { defineRule, type ESTree } from "@oxlint/plugins";

function isAllowedTypeAnnotation(typeAnnotation: ESTree.TSType): boolean {
  // `as unknown` and `<unknown>` are allowed
  if (typeAnnotation.type === "TSUnknownKeyword") {
    return true;
  }
  // `as const` and `<const>`: both oxlint (verified with the RuleTester of 1.47, 1.70 and 1.93)
  // and @typescript-eslint/parser produce a TSTypeReference named `const`. A TSTypeOperator
  // `const` shape is also accepted defensively; no tested runtime produces it.
  // (The ESTree types don't list "const" as a TSTypeOperator operator, hence the string widening.)
  if (typeAnnotation.type === "TSTypeOperator" && (typeAnnotation.operator as string) === "const") {
    return true;
  }
  if (
    typeAnnotation.type === "TSTypeReference" &&
    typeAnnotation.typeName.type === "Identifier" &&
    typeAnnotation.typeName.name === "const"
  ) {
    return true;
  }
  return false;
}

export default defineRule({
  meta: {
    type: "suggestion" as const,
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
  createOnce(context) {
    return {
      // Angle-bracket syntax: <Type>value
      TSTypeAssertion(node) {
        if (isAllowedTypeAnnotation(node.typeAnnotation)) {
          return;
        }
        context.report({ node, messageId: "angleBracketAssertion" });
      },

      // As-operator syntax: value as Type
      TSAsExpression(node) {
        if (isAllowedTypeAnnotation(node.typeAnnotation)) {
          return;
        }
        context.report({ node, messageId: "asAssertion" });
      },

      // Non-null assertion: value!
      TSNonNullExpression(node) {
        context.report({ node, messageId: "nonNullAssertion" });
      },
    };
  },
});
