import { defineRule } from "@oxlint/plugins";
import { trackImports } from "../utils/imports.ts";
import { trace } from "../utils/trace.ts";
import { isFunctionNode } from "../utils/functions.ts";

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow usage of dependency arrays in `createEffect` and `createMemo`.",
      recommended: "error",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      noUselessDep:
        "In Solid, `{{name}}` doesn't accept a dependency array because it automatically tracks its dependencies. If you really need to override the list of dependencies, use `on`.",
    },
  },
  createOnce(context) {
    const tracker = trackImports();

    return {
      before() {
        tracker.clear();
      },

      Program() {
        tracker.clear();
      },

      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);
      },

      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          tracker.matchImport(["createEffect", "createMemo"], node.callee.name) &&
          node.arguments.length === 2 &&
          node.arguments.every((arg) => arg.type !== "SpreadElement")
        ) {
          const [arg0, arg1] = node.arguments.map((arg) => trace(arg, context));
          const depsArg = node.arguments[1];

          if (depsArg && isFunctionNode(arg0) && arg0.params.length === 0 && arg1?.type === "ArrayExpression") {
            context.report({
              node: depsArg,
              messageId: "noUselessDep",
              data: { name: node.callee.name },
              fix: arg1 === depsArg ? (fixer) => fixer.remove(arg1) : undefined,
            });
          }
        }
      },
    };
  },
});
