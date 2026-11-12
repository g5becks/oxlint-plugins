import { defineRule, type ESTree } from "@oxlint/plugins";
import { appendImports, insertImports } from "../utils/fix-imports.ts";
import { isDOMElementName } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";
import { cannotContainJSX } from "../utils/files.ts";

const AUTO_COMPONENTS = ["Show", "For", "Index", "Switch", "Match"];
const SOURCE_MODULE = "solid-js";

const formatList = (strings: Array<string>): string => {
  if (strings.length === 0) return "";
  if (strings.length === 1) return `'${strings[0]}'`;
  if (strings.length === 2) return `'${strings[0]}' and '${strings[1]}'`;
  const last = strings.length - 1;
  return `${strings
    .slice(0, last)
    .map((s) => `'${s}'`)
    .join(", ")}, and '${strings[last]}'`;
};

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow references to undefined variables in JSX. Handles custom directives.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/jsx-no-undef.md",
    },
    fixable: "code" as const,
    schema: [
      {
        type: "object",
        properties: {
          allowGlobals: {
            type: "boolean",
            description: "When true, the rule will consider the global scope when checking for defined components.",
            default: false,
          },
          autoImport: {
            type: "boolean",
            description: 'Automatically import certain components from `"solid-js"` if they are undefined.',
            default: true,
          },
          typescriptEnabled: {
            type: "boolean",
            description: "Adjusts behavior not to conflict with TypeScript's type checking.",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefined: "'{{identifier}}' is not defined.",
      customDirectiveUndefined: "Custom directive '{{identifier}}' is not defined.",
      autoImport: "{{imports}} should be imported from '{{source}}'.",
    },
  },
  createOnce(context) {
    const missingComponentsSet = new Set<string>();
    const options = () =>
      ruleOptions<{ allowGlobals?: boolean; autoImport?: boolean; typescriptEnabled?: boolean }>(context);

    function checkIdentifierInJSX(
      node: ESTree.JSXIdentifier,
      opts: { isComponent?: boolean; isCustomDirective?: boolean } = {},
    ) {
      let scope = context.sourceCode.getScope(node);
      if (!scope) return;
      const sourceCode = context.sourceCode;
      const sourceType = sourceCode.ast.sourceType;
      const scopeUpperBound = !(options()?.allowGlobals ?? false) && sourceType === "module" ? "module" : "global";
      const variables = [...scope.variables];

      if (node.name === "this") return;

      while (scope.type !== scopeUpperBound && scope.type !== "global" && scope.upper) {
        scope = scope.upper;
        variables.push(...scope.variables);
      }
      const child = scope.childScopes[0];
      if (child) {
        variables.push(...child.variables);
        const grandchild = child.childScopes[0];
        if (grandchild) {
          variables.push(...grandchild.variables);
        }
      }

      if (variables.find((variable) => variable.name === node.name)) {
        return;
      }

      if (
        opts.isComponent &&
        options()?.autoImport !== false &&
        AUTO_COMPONENTS.includes(node.name) &&
        !missingComponentsSet.has(node.name)
      ) {
        missingComponentsSet.add(node.name);
      } else if (opts.isCustomDirective) {
        context.report({
          node,
          messageId: "customDirectiveUndefined",
          data: { identifier: node.name },
        });
      } else if (!(options()?.typescriptEnabled ?? false)) {
        context.report({
          node,
          messageId: "undefined",
          data: { identifier: node.name },
        });
      }
    }

    return {
      // createOnce runs once per worker; per-file state must be reset for every file (audit R9).
      before() {
        missingComponentsSet.clear();
        // JSX-only rule: skip files that can't contain JSX (audit P3).
        return !cannotContainJSX(context.filename);
      },
      JSXOpeningElement(node) {
        let n: ESTree.Node;
        switch (node.name.type) {
          case "JSXIdentifier":
            if (!isDOMElementName(node.name.name)) {
              checkIdentifierInJSX(node.name, { isComponent: true });
            }
            break;
          case "JSXMemberExpression":
            // The innermost object of `<a.b.c>` (a `this` object is not checked).
            n = node.name.object;
            while (n.type === "JSXMemberExpression") {
              n = n.object;
            }
            if (n.type === "JSXIdentifier") {
              checkIdentifierInJSX(n);
            }
            break;
          default:
            break;
        }
      },
      "JSXAttribute > JSXNamespacedName": (node) => {
        if (
          node.type === "JSXNamespacedName" &&
          node.namespace.type === "JSXIdentifier" &&
          node.namespace.name === "use" &&
          node.name.type === "JSXIdentifier"
        ) {
          checkIdentifierInJSX(node.name, { isCustomDirective: true });
        }
      },
      "Program:exit": (programNode) => {
        const missingComponents = Array.from(missingComponentsSet.values());
        if (options()?.autoImport !== false && missingComponents.length) {
          const importNode = programNode.body.find(
            (n): n is ESTree.ImportDeclaration =>
              n.type === "ImportDeclaration" &&
              n.importKind !== "type" &&
              n.source.type === "Literal" &&
              n.source.value === SOURCE_MODULE,
          );
          if (importNode) {
            context.report({
              node: importNode,
              messageId: "autoImport",
              data: {
                imports: formatList(missingComponents),
                source: SOURCE_MODULE,
              },
              fix: (fixer) => {
                return appendImports(fixer, context.sourceCode, importNode, missingComponents);
              },
            });
          } else {
            context.report({
              node: programNode,
              messageId: "autoImport",
              data: {
                imports: formatList(missingComponents),
                source: SOURCE_MODULE,
              },
              fix: (fixer) => {
                return insertImports(fixer, context.sourceCode, "solid-js", missingComponents);
              },
            });
          }
        }
      },
    };
  },
});
