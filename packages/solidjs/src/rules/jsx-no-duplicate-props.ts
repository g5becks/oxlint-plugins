import { defineRule, type ESTree } from "@oxlint/plugins";
import { jsxGetAllProps } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";
import { cannotContainJSX } from "../utils/files.ts";

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow passing the same prop twice in JSX.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          ignoreCase: {
            type: "boolean",
            description: "Consider two prop names differing only by case to be the same.",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noDuplicateProps: "Duplicate props are not allowed.",
      noDuplicateClass:
        "Duplicate `class` props are not allowed; while it might seem to work, it can break unexpectedly. Use `classList` instead.",
      noDuplicateChildren: "Using {{used}} at the same time is not allowed.",
    },
  },
  createOnce(context) {
    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        return !cannotContainJSX(context.filename);
      },
      JSXOpeningElement(node) {
        const ignoreCase = ruleOptions<{ ignoreCase?: boolean }>(context)?.ignoreCase ?? false;
        const props = new Set<string>();
        const checkPropName = (name: string, propNode: ESTree.Node) => {
          let normalizedName = name;
          if (ignoreCase || name.startsWith("on")) {
            normalizedName = name
              .toLowerCase()
              .replace(/^on(?:capture)?:/, "on")
              .replace(/^(?:attr|prop):/, "");
          }
          if (props.has(normalizedName)) {
            context.report({
              node: propNode,
              messageId: normalizedName === "class" ? "noDuplicateClass" : "noDuplicateProps",
            });
          }
          props.add(normalizedName);
        };

        for (const [name, propNode] of jsxGetAllProps(node.attributes ?? [])) {
          checkPropName(name, propNode);
        }

        const hasChildrenProp = props.has("children");
        const hasChildren = (node.parent.type === "JSXElement" ? node.parent.children.length : 0) > 0;
        const hasInnerHTML = props.has("innerHTML") || props.has("innerhtml");
        const hasTextContent = props.has("textContent") || props.has("textcontent");
        const used = [
          hasChildrenProp && "`props.children`",
          hasChildren && "JSX children",
          hasInnerHTML && "`props.innerHTML`",
          hasTextContent && "`props.textContent`",
        ].filter(Boolean);
        if (used.length > 1) {
          context.report({
            node,
            messageId: "noDuplicateChildren",
            data: { used: used.join(", ") },
          });
        }
      },
    };
  },
});
