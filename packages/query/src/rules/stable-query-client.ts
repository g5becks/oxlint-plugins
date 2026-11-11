import { createTanstackQueryImportTracker } from "../utils/detect-query-imports.ts";
import { ASTUtils } from "../utils/ast-utils.ts";

export default {
  meta: {
    type: "problem" as const,
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
    fixable: "code" as const,
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
          if (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportNamespaceSpecifier") {
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

        // Determine the correct useState call based on what's imported in the file:
        // 1. `import { useState } from "react"` -> the local name
        // 2. `import React from "react"` / `import * as React from "react"` -> `<namespace>.useState`
        // 3. no react import -> `React.useState`, which only works with a global `React`: offered as a
        //    suggestion, never an autofix, so `oxlint --fix` can't introduce an undefined reference
        //    (upstream autofixes this case too; see PARITY.md#query-stable-query-client-no-react-import).
        const useStateCall =
          useStateLocalName ?? (reactNamespaceName != null ? `${reactNamespaceName}.useState` : null);
        const fixWith = (call: string) =>
          parent.id?.type === "Identifier"
            ? (fixer: any) =>
                fixer.replaceTextRange(
                  [parent.range[0], parent.range[1]],
                  `[${parent.id.name}] = ${call}(() => ${sourceCode.getText(node)})`,
                )
            : undefined;

        if (useStateCall != null) {
          context.report({ node: parent, messageId: "unstable", fix: fixWith(useStateCall) });
        } else {
          const fix = fixWith("React.useState");
          context.report({
            node: parent,
            messageId: "unstable",
            suggest: fix ? [{ messageId: "fixTo", data: { result: "React.useState(() => ...)" }, fix }] : [],
          });
        }
      },
    };
  },
};
