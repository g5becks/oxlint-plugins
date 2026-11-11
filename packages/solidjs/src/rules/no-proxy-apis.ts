import { trackImports } from "../utils/imports";
import { trace } from "../utils/trace";

function isFunctionNode(node: any): boolean {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(
    node?.type,
  );
}

function isPropsByName(name: string): boolean {
  return /^(?:props|_props)$/.test(name);
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow usage of APIs that use ES6 Proxies, only to target environments that don't support them.",
      recommended: "warn",
    },
    schema: [],
    messages: {
      noStore:
        "Solid Store APIs use Proxies, which are incompatible with your target environment.",
      spreadCall:
        "Using a function call in JSX spread makes Solid use Proxies, which are incompatible with your target environment.",
      spreadMember:
        "Using a property access in JSX spread makes Solid use Proxies, which are incompatible with your target environment.",
      proxyLiteral: "Proxies are incompatible with your target environment.",
      mergeProps:
        "If you pass a function to `mergeProps`, it will create a Proxy, which are incompatible with your target environment.",
    },
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = trackImports();

    return {
      before() {
        tracker.clear();
      },

      Program() {
        tracker.clear();
      },

      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);

        if (node.source?.value === "solid-js/store") {
          context.report({ node, messageId: "noStore" });
        }
      },

      "JSXSpreadAttribute MemberExpression"(node: any) {
        context.report({ node, messageId: "spreadMember" });
      },

      "JSXSpreadAttribute CallExpression"(node: any) {
        context.report({ node, messageId: "spreadCall" });
      },

      CallExpression(node: any) {
        if (node.callee?.type === "Identifier") {
          if (tracker.matchImport("mergeProps", node.callee.name)) {
            (node.arguments ?? [])
              .filter((arg: any) => {
                if (arg.type === "SpreadElement") return true;
                const traced = trace(arg, context);
                return (
                  (traced.type === "Identifier" && !isPropsByName(traced.name)) ||
                  isFunctionNode(traced)
                );
              })
              .forEach((badArg: any) => {
                context.report({ node: badArg, messageId: "mergeProps" });
              });
          }
        } else if (node.callee?.type === "MemberExpression") {
          if (
            node.callee.object?.type === "Identifier" &&
            node.callee.object.name === "Proxy" &&
            node.callee.property?.type === "Identifier" &&
            node.callee.property.name === "revocable"
          ) {
            context.report({ node, messageId: "proxyLiteral" });
          }
        }
      },

      NewExpression(node: any) {
        if (node.callee?.type === "Identifier" && node.callee.name === "Proxy") {
          context.report({ node, messageId: "proxyLiteral" });
        }
      },
    };
  },
};
