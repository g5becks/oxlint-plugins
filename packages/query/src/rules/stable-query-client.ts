import { createTanstackQueryImportTracker } from "../utils/detect-query-imports";
import { ASTUtils } from "../utils/ast-utils";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Makes sure that QueryClient is stable",
      recommended: "error",
    },
    messages: {
      unstable: [
        "QueryClient is not stable. It should be either extracted from the component or wrapped in useState (or React.useState).",
        "See https://tkdodo.eu/blog/react-query-fa-qs#2-the-queryclient-is-not-stable",
      ].join("\n"),
      fixTo: "Fix to {{result}}",
    },
    hasSuggestions: true,
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = createTanstackQueryImportTracker();
    // Track how useState is available: "React.useState" (namespace) or a local name (named import).
    let useStateLocalName: string | null = null;
    let reactNamespaceName: string | null = null;

    return {
      before() {
        tracker.reset();
        useStateLocalName = null;
        reactNamespaceName = null;
      },

      Program() {
        tracker.reset();
        useStateLocalName = null;
        reactNamespaceName = null;
      },

      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);

        if (node.source?.value !== "react" || node.importKind === "type") {
          return;
        }

        for (const specifier of node.specifiers ?? []) {
          // import React from "react"  or  import * as React from "react"
          if (
            specifier.type === "ImportDefaultSpecifier" ||
            specifier.type === "ImportNamespaceSpecifier"
          ) {
            reactNamespaceName = specifier.local?.name ?? null;
          }
          // import { useState } from "react"  or  import { useState as useSt } from "react"
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported?.type === "Identifier" &&
            specifier.imported.name === "useState"
          ) {
            useStateLocalName = specifier.local?.name ?? null;
          }
        }
      },

      NewExpression(node: any) {
        if (
          node.callee?.type !== "Identifier" ||
          node.callee.name !== "QueryClient" ||
          node.parent?.type !== "VariableDeclarator" ||
          !tracker.isSpecificTanstackQueryImportByName(node.callee.name, "@tanstack/react-query")
        ) {
          return;
        }

        const sourceCode = context.sourceCode;
        const fnAncestor = ASTUtils.getFunctionAncestor(sourceCode, node);
        const isReactServerComponent = fnAncestor?.async === true;

        if (!ASTUtils.isValidReactComponentOrHookName(fnAncestor?.id) || isReactServerComponent) {
          return;
        }

        const parent = node.parent;

        context.report({
          node: parent,
          messageId: "unstable",
          fix: (() => {
            if (parent.id?.type !== "Identifier") {
              return;
            }

            const nodeText = sourceCode.getText(node);
            const variableName = parent.id.name;

            // Determine the correct useState call based on what's imported in the file:
            // 1. `import { useState } from "react"` → use the local name directly
            // 2. `import React from "react"` or `import * as React from "react"` → use `namespace.useState`
            // 3. No react import detected → fall back to `React.useState` (global React or forgetting the import)
            let useStateCall: string;
            if (useStateLocalName != null) {
              useStateCall = useStateLocalName;
            } else if (reactNamespaceName != null) {
              useStateCall = `${reactNamespaceName}.useState`;
            } else {
              useStateCall = "React.useState";
            }

            return (fixer: any) => {
              return fixer.replaceTextRange(
                [parent.range[0], parent.range[1]],
                `[${variableName}] = ${useStateCall}(() => ${nodeText})`,
              );
            };
          })(),
        });
      },
    };
  },
};
