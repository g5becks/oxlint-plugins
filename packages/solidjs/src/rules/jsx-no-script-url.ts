import { getStaticString } from "../utils/static-value.ts";
// Control characters are intentional: browsers ignore leading C0 controls and embedded
// tab/CR/LF in URLs, so they must be matched to catch `javascript:` (same as upstream).
const isJavaScriptProtocol =
  // oxlint-disable-next-line no-control-regex
  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;

export default {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow javascript: URLs.",
      recommended: "error",
    },
    schema: [],
    messages: {
      noJSURL: "For security, don't use javascript: URLs. Use event handlers instead if you can.",
    },
  },
  defaultOptions: [],
  createOnce(context: any) {
    return {
      JSXAttribute(node: any) {
        if (node.name?.type === "JSXIdentifier" && node.value) {
          const valueNode = node.value.type === "JSXExpressionContainer" ? node.value.expression : node.value;
          const scope = context.sourceCode.getScope(node);
          const link = getStaticString(valueNode, scope);
          if (typeof link === "string" && isJavaScriptProtocol.test(link)) {
            context.report({
              node: node.value,
              messageId: "noJSURL",
            });
          }
        }
      },
    };
  },
};
