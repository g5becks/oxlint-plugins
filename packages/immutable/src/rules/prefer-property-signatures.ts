import { defineRule, type ESTree } from "@oxlint/plugins";
import { ruleOptions } from "../utils/options.ts";

function hasReadonlyWrapper(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current) {
    if (
      current.type === "TSTypeReference" &&
      current.typeName.type === "Identifier" &&
      current.typeName.name === "Readonly"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

type RuleOptions = [{ ignoreIfReadonlyWrapped?: boolean }?];

export default defineRule({
  meta: {
    type: "suggestion" as const,
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
    fixable: "code" as const,
    messages: {
      generic: "Use a property signature instead of a method signature.",
    },
    defaultOptions: [{ ignoreIfReadonlyWrapped: false }],
  },
  createOnce(context) {
    return {
      TSMethodSignature(node) {
        const ignoreIfReadonlyWrapped =
          ruleOptions<NonNullable<RuleOptions[0]>>(context)?.ignoreIfReadonlyWrapped === true;
        if (ignoreIfReadonlyWrapped && hasReadonlyWrapper(node)) {
          return;
        }

        context.report({
          node,
          messageId: "generic",
          fix(fixer) {
            const sourceCode = context.sourceCode;
            const keyText = sourceCode.getText(node.key);
            const optional = node.optional ? "?" : "";
            const typeParams = node.typeParameters ? sourceCode.getText(node.typeParameters) : "";
            const params = node.params.map((param) => sourceCode.getText(param)).join(", ");
            const returnType = node.returnType ? sourceCode.getText(node.returnType.typeAnnotation) : "void";
            const replacement = `${keyText}${optional}: ${typeParams}(${params}) => ${returnType}`;
            return fixer.replaceText(node, replacement);
          },
        });
      },
    };
  },
});
