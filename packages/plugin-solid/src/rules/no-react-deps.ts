import { trackImports } from "../utils/imports";
import { trace } from "../utils/trace";

function isFunctionNode(node: any): boolean {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(
    node?.type,
  );
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow usage of dependency arrays in `createEffect` and `createMemo`.",
      recommended: "error",
    },
    fixable: "code",
    schema: [],
    messages: {
      noUselessDep:
        "In Solid, `{{name}}` doesn't accept a dependency array because it automatically tracks its dependencies. If you really need to override the list of dependencies, use `on`.",
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
      },

      CallExpression(node: any) {
        if (
          node.callee?.type === "Identifier" &&
          tracker.matchImport(["createEffect", "createMemo"], node.callee.name) &&
          node.arguments?.length === 2 &&
          node.arguments.every((arg: any) => arg.type !== "SpreadElement")
        ) {
          const [arg0, arg1] = node.arguments.map((arg: any) => trace(arg, context));

          if (
            isFunctionNode(arg0) &&
            arg0.params.length === 0 &&
            arg1.type === "ArrayExpression"
          ) {
            context.report({
              node: node.arguments[1],
              messageId: "noUselessDep",
              data: { name: node.callee.name },
              fix: arg1 === node.arguments[1] ? (fixer: any) => fixer.remove(arg1) : undefined,
            });
          }
        }
      },
    };
  },
};
