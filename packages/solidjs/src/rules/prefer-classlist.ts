import { defineRule } from "@oxlint/plugins";
import { jsxHasProp, jsxPropName } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";
import { cannotContainJSX } from "../utils/files.ts";

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames.",
      recommended: "warn",
    },
    fixable: "code" as const,
    deprecated: true,
    schema: [
      {
        type: "object",
        properties: {
          classnames: {
            type: "array",
            description: "An array of names to treat as `classnames` functions",
            default: ["cn", "clsx", "classnames"],
            items: { type: "string" },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferClasslist:
        "The classlist prop should be used instead of {{ classnames }} to efficiently set classes based on an object.",
    },
  },
  createOnce(context) {
    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        return !cannotContainJSX(context.filename);
      },
      JSXAttribute(node) {
        const classnames = ruleOptions<{ classnames?: Array<string> }>(context)?.classnames ?? [
          "cn",
          "clsx",
          "classnames",
        ];
        if (
          ["class", "className"].indexOf(jsxPropName(node)) === -1 ||
          jsxHasProp(node.parent.type === "JSXOpeningElement" ? node.parent.attributes : [], "classlist")
        ) {
          return;
        }
        if (node.value?.type === "JSXExpressionContainer") {
          const expr = node.value.expression;
          const objectArg = expr.type === "CallExpression" ? expr.arguments[0] : undefined;
          if (
            expr.type === "CallExpression" &&
            expr.callee.type === "Identifier" &&
            classnames.indexOf(expr.callee.name) !== -1 &&
            expr.arguments.length === 1 &&
            objectArg?.type === "ObjectExpression"
          ) {
            context.report({
              node,
              messageId: "preferClasslist",
              data: { classnames: expr.callee.name },
              fix: (fixer) => {
                const attrRange = node.range;
                const objectRange = objectArg.range;
                return [
                  fixer.replaceTextRange([attrRange[0], objectRange[0]], "classlist={"),
                  fixer.replaceTextRange([objectRange[1], attrRange[1]], "}"),
                ];
              },
            });
          }
        }
      },
    };
  },
});
