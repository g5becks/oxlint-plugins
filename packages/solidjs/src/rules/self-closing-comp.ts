import { defineRule, type ESTree } from "@oxlint/plugins";
import { isDOMElementName } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";

const voidDOMElementRegex = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

function isComponent(node: ESTree.JSXOpeningElement): boolean {
  return (
    (node.name.type === "JSXIdentifier" && !isDOMElementName(node.name.name)) ||
    node.name.type === "JSXMemberExpression"
  );
}

function childrenOf(node: ESTree.JSXOpeningElement): ReadonlyArray<ESTree.JSXChild> {
  return node.parent.type === "JSXElement" ? node.parent.children : [];
}

function childrenIsEmpty(node: ESTree.JSXOpeningElement): boolean {
  return childrenOf(node).length === 0;
}

function childrenIsMultilineSpaces(node: ESTree.JSXOpeningElement): boolean {
  const children = childrenOf(node);
  const first = children[0];
  return (
    children.length === 1 &&
    first?.type === "JSXText" &&
    first.value.indexOf("\n") !== -1 &&
    first.value.replace(/(?!\xA0)\s/g, "") === ""
  );
}

export default defineRule({
  meta: {
    type: "layout" as const,
    docs: {
      description: "Disallow extra closing tags for components without children.",
      recommended: "error",
    },
    fixable: "code" as const,
    schema: [
      {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "which Solid components should be self-closing when possible",
            enum: ["all", "none"],
            default: "all",
          },
          html: {
            type: "string",
            description: "which native elements should be self-closing when possible",
            enum: ["all", "void", "none"],
            default: "all",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      selfClose: "Empty components are self-closing.",
      dontSelfClose: "This element should not be self-closing.",
    },
  },
  createOnce(context) {
    const options = () => ruleOptions<{ component?: "all" | "none"; html?: "all" | "void" | "none" }>(context);
    function shouldBeSelfClosedWhenPossible(node: ESTree.JSXOpeningElement): boolean {
      if (isComponent(node)) {
        return (options()?.component ?? "all") === "all";
      } else if (node.name.type === "JSXIdentifier" && isDOMElementName(node.name.name)) {
        const whichHtml = options()?.html ?? "all";
        switch (whichHtml) {
          case "all":
            return true;
          case "void":
            return voidDOMElementRegex.test(node.name.name);
          case "none":
            return false;
        }
      }
      return true;
    }

    return {
      JSXOpeningElement(node) {
        const canSelfClose = childrenIsEmpty(node) || childrenIsMultilineSpaces(node);
        if (canSelfClose) {
          const shouldSelfClose = shouldBeSelfClosedWhenPossible(node);
          if (shouldSelfClose && !node.selfClosing) {
            context.report({
              node,
              messageId: "selfClose",
              fix(fixer) {
                const openingElementEnding = node.range[1] - 1;
                const closingElementEnding =
                  node.parent.type === "JSXElement" ? node.parent.closingElement?.range[1] : undefined;
                if (closingElementEnding == null) return null;
                return fixer.replaceTextRange([openingElementEnding, closingElementEnding], " />");
              },
            });
          } else if (!shouldSelfClose && node.selfClosing) {
            context.report({
              node,
              messageId: "dontSelfClose",
              fix(fixer) {
                const sourceCode = context.sourceCode;
                const tagName = sourceCode.getText(node.name);
                const selfCloseEnding = node.range[1];
                const lastTokens = sourceCode.getLastTokens(node, { count: 3 });
                const [first, second] = lastTokens; // a self-closing tag ends with `/` `>`: always present
                const isSpaceBeforeSelfClose = first && second ? sourceCode.isSpaceBetween?.(first, second) : false;
                const range: [number, number] = [
                  isSpaceBeforeSelfClose ? selfCloseEnding - 3 : selfCloseEnding - 2,
                  selfCloseEnding,
                ];
                return fixer.replaceTextRange(range, `></${tagName}>`);
              },
            });
          }
        }
      },
    };
  },
});
