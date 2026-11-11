import { isDOMElementName, jsxGetProp, jsxHasProp } from "../utils/jsx";

const reactSpecificProps = [
  { from: "className", to: "class" },
  { from: "htmlFor", to: "for" },
];

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow usage of React-specific `className`/`htmlFor` props, which were deprecated in v1.4.0.",
      recommended: "error",
    },
    fixable: "code",
    schema: [],
    messages: {
      prefer: "Prefer the `{{ to }}` prop over the deprecated `{{ from }}` prop.",
      noUselessKey: "Elements in a <For> or <Index> list do not need a key prop.",
    },
  },
  defaultOptions: [],
  createOnce(context: any) {
    return {
      JSXOpeningElement(node: any) {
        for (const { from, to } of reactSpecificProps) {
          const classNameAttribute = jsxGetProp(node.attributes ?? [], from);
          if (classNameAttribute) {
            const fix = !jsxHasProp(node.attributes ?? [], to)
              ? (fixer: any) => fixer.replaceText(classNameAttribute.name, to)
              : undefined;

            context.report({
              node: classNameAttribute,
              messageId: "prefer",
              data: { from, to },
              fix,
            });
          }
        }
        if (node.name?.type === "JSXIdentifier" && isDOMElementName(node.name.name)) {
          const keyProp = jsxGetProp(node.attributes ?? [], "key");
          if (keyProp) {
            context.report({
              node: keyProp,
              messageId: "noUselessKey",
              fix: (fixer: any) => fixer.remove(keyProp),
            });
          }
        }
      },
    };
  },
};
