import { createRouteFunctions, createRouteFunctionsIndirect, sortRules } from "../utils/constants";
import { createTanstackRouterImportTracker } from "../utils/detect-router-imports";
import { sortDataByOrder } from "../utils/sort-data-by-order";

const createRouteFunctionSet = new Set<string>(createRouteFunctions);

function isCreateRouteFunction(name: string): boolean {
  return createRouteFunctionSet.has(name);
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Ensure correct order of inference sensitive properties for createRoute functions",
      recommended: "error",
    },
    messages: {
      invalidOrder: "Invalid order of properties for `{{function}}`.",
    },
    schema: [],
    hasSuggestions: true,
    fixable: "code",
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = createTanstackRouterImportTracker();

    return {
      before() {
        tracker.reset();
      },
      Program() {
        tracker.reset();
      },
      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);
      },
      CallExpression(node: any) {
        if (node?.callee?.type !== "Identifier") {
          return;
        }

        const createRouteFunction = node.callee.name;
        if (!isCreateRouteFunction(createRouteFunction) || !tracker.isTanstackRouterImport(createRouteFunction)) {
          return;
        }

        let args = node.arguments;
        if ((createRouteFunctionsIndirect as ReadonlyArray<string>).includes(createRouteFunction)) {
          if (node.parent?.type === "CallExpression") {
            args = node.parent.arguments;
          } else {
            return;
          }
        }

        const argument = args?.[0];
        if (argument?.type !== "ObjectExpression") {
          return;
        }

        const allProperties = argument.properties ?? [];
        if (allProperties.length < 2) {
          return;
        }

        type PropertyEntry = { name: string; property: any };
        const properties: PropertyEntry[] = allProperties.flatMap((property: any) => {
          if (property?.type === "Property" && property.key?.type === "Identifier") {
            return [{ name: property.key.name as string, property }];
          }
          if (property?.type === "SpreadElement" && property.argument?.type === "Identifier") {
            return [{ name: property.argument.name as string, property }];
          }
          return [];
        });

        const sortedProperties = sortDataByOrder<PropertyEntry, "name">(properties, sortRules as any, "name");
        if (sortedProperties == null) {
          return;
        }

        context.report({
          node: argument,
          data: { function: createRouteFunction },
          messageId: "invalidOrder",
          fix(fixer: any) {
            const sourceCode = context.sourceCode;
            const text = sortedProperties.reduce((sourceText, specifier, index) => {
              let between = "";
              if (index < allProperties.length - 1) {
                between = sourceCode.getText().slice(allProperties[index].range[1], allProperties[index + 1].range[0]);
              }
              return sourceText + sourceCode.getText(specifier.property) + between;
            }, "");

            const lastProp = allProperties[allProperties.length - 1];
            return fixer.replaceTextRange([allProperties[0].range[0], lastProp.range[1]], text);
          },
        });
      },
    };
  },
};
