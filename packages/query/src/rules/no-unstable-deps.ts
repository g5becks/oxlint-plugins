import { createTanstackQueryImportTracker } from "../utils/detect-query-imports";

const reactHookNames = ["useEffect", "useCallback", "useMemo"];
const useQueryHookNames = [
  "useQuery",
  "useSuspenseQuery",
  "useQueries",
  "useSuspenseQueries",
  "useInfiniteQuery",
  "useSuspenseInfiniteQuery",
];
const allHookNames = ["useMutation", ...useQueryHookNames];
const allHookNameSet = new Set(allHookNames);

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow putting the result of query hooks directly in a React hook dependency array",
      recommended: "error",
    },
    messages: {
      noUnstableDeps:
        "The result of {{queryHook}} is not referentially stable, so don't pass it directly into the dependencies array of {{reactHook}}. Instead, destructure the return value of {{queryHook}} and pass the destructured values into the dependency array of {{reactHook}}.",
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = createTanstackQueryImportTracker();
    const trackedVariables: Record<string, string> = {};
    const hookAliasMap: Record<string, string> = {};

    function getReactHook(node: any): string | undefined {
      if (node.callee?.type === "Identifier") {
        const calleeName = node.callee.name;
        if (reactHookNames.includes(calleeName) || calleeName in hookAliasMap) {
          return calleeName;
        }
      } else if (
        node.callee?.type === "MemberExpression" &&
        node.callee.object?.type === "Identifier" &&
        node.callee.object.name === "React" &&
        node.callee.property?.type === "Identifier" &&
        reactHookNames.includes(node.callee.property.name)
      ) {
        return node.callee.property.name;
      }
      return undefined;
    }

    function hasCombineProperty(callExpression: any): boolean {
      if (!callExpression.arguments?.length) return false;
      const firstArg = callExpression.arguments[0];
      if (!firstArg || firstArg.type !== "ObjectExpression") return false;
      return (firstArg.properties ?? []).some(
        (prop: any) =>
          prop.type === "Property" && prop.key?.type === "Identifier" && prop.key.name === "combine",
      );
    }

    return {
      before() {
        tracker.reset();
        for (const key of Object.keys(trackedVariables)) delete trackedVariables[key];
        for (const key of Object.keys(hookAliasMap)) delete hookAliasMap[key];
      },

      Program() {
        tracker.reset();
        for (const key of Object.keys(trackedVariables)) delete trackedVariables[key];
        for (const key of Object.keys(hookAliasMap)) delete hookAliasMap[key];
      },

      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);

        if (
          node.specifiers?.length > 0 &&
          node.importKind === "value" &&
          node.source?.value === "react"
        ) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported?.type === "Identifier" &&
              reactHookNames.includes(specifier.imported.name)
            ) {
              hookAliasMap[specifier.local.name] = specifier.imported.name;
            }
          }
        }
      },

      VariableDeclarator(node: any) {
        if (
          node.init?.type === "CallExpression" &&
          node.init.callee?.type === "Identifier" &&
          allHookNameSet.has(node.init.callee.name) &&
          tracker.isTanstackQueryImportByName(node.init.callee.name)
        ) {
          if (node.init.callee.name === "useQueries" && hasCombineProperty(node.init)) {
            return;
          }
          if (node.id?.type === "Identifier") {
            trackedVariables[node.id.name] = node.init.callee.name;
          }
        }
      },

      CallExpression(node: any) {
        const reactHook = getReactHook(node);
        if (
          reactHook !== undefined &&
          node.arguments?.length > 1 &&
          node.arguments[1]?.type === "ArrayExpression"
        ) {
          const depsArray = node.arguments[1].elements ?? [];
          for (const dep of depsArray) {
            if (
              dep != null &&
              dep.type === "Identifier" &&
              trackedVariables[dep.name] !== undefined
            ) {
              const queryHook = trackedVariables[dep.name];
              context.report({
                node: dep,
                messageId: "noUnstableDeps",
                data: { queryHook, reactHook },
              });
            }
          }
        }
      },
    };
  },
};
