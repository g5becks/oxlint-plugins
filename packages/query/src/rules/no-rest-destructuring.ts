import { createTanstackQueryImportTracker } from "../utils/detect-query-imports";
import { queryHooks } from "../utils/constants";

const queryHookSet = new Set<string>(queryHooks);

function isObjectRestDestructuring(node: any): boolean {
  if (node?.type !== "ObjectPattern") {
    return false;
  }
  return (node.properties ?? []).some((p: any) => p.type === "RestElement");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallows rest destructuring in queries",
      recommended: "warn",
    },
    messages: {
      objectRestDestructure:
        "Object rest destructuring on a query will observe all changes to the query, leading to excessive re-renders.",
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = createTanstackQueryImportTracker();
    const queryResultVariables = new Set<string>();

    return {
      before() {
        tracker.reset();
        queryResultVariables.clear();
      },

      Program() {
        tracker.reset();
        queryResultVariables.clear();
      },

      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);
      },

      CallExpression(node: any) {
        if (node?.callee?.type !== "Identifier") {
          return;
        }

        const calleeName = node.callee.name;
        if (!queryHookSet.has(calleeName) || !tracker.isTanstackQueryImportByName(calleeName)) {
          return;
        }

        if (node.parent?.type !== "VariableDeclarator") {
          return;
        }

        const returnValue = node.parent.id;

        if (calleeName !== "useQueries" && calleeName !== "useSuspenseQueries") {
          if (isObjectRestDestructuring(returnValue)) {
            context.report({
              node: node.parent,
              messageId: "objectRestDestructure",
            });
            return;
          }

          if (returnValue?.type === "Identifier") {
            queryResultVariables.add(returnValue.name);
          }

          return;
        }

        if (returnValue?.type !== "ArrayPattern") {
          if (returnValue?.type === "Identifier") {
            queryResultVariables.add(returnValue.name);
          }
          return;
        }

        for (const queryResult of returnValue.elements ?? []) {
          if (queryResult == null) {
            continue;
          }
          if (isObjectRestDestructuring(queryResult)) {
            context.report({
              node: queryResult,
              messageId: "objectRestDestructure",
            });
          }
        }
      },

      VariableDeclarator(node: any) {
        if (
          node.init?.type === "Identifier" &&
          queryResultVariables.has(node.init.name) &&
          isObjectRestDestructuring(node.id)
        ) {
          context.report({
            node,
            messageId: "objectRestDestructure",
          });
        }
      },

      SpreadElement(node: any) {
        if (node.argument?.type === "Identifier" && queryResultVariables.has(node.argument.name)) {
          context.report({
            node,
            messageId: "objectRestDestructure",
          });
        }
      },
    };
  },
};
