import { defineRule, type ESTree } from "@oxlint/plugins";
import { createRouteFunctions, createRouteFunctionsIndirect, sortRules } from "../utils/constants.ts";
import { createTanstackRouterImportTracker } from "../utils/detect-router-imports.ts";
import { sortDataByOrder } from "../utils/sort-data-by-order.ts";

const createRouteFunctionSet = new Set<string>(createRouteFunctions);

function isCreateRouteFunction(name: string): boolean {
  return createRouteFunctionSet.has(name);
}

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Ensure correct order of inference sensitive properties for createRoute functions",
      recommended: "error",
    },
    messages: {
      invalidOrder: "Invalid order of properties for `{{function}}`.",
    },
    schema: [],
    hasSuggestions: true,
    fixable: "code" as const,
  },
  createOnce(context) {
    const tracker = createTanstackRouterImportTracker();

    return {
      before() {
        tracker.reset();
      },
      Program() {
        tracker.reset();
      },
      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier") {
          return;
        }

        const createRouteFunction = node.callee.name;
        if (!isCreateRouteFunction(createRouteFunction) || !tracker.isTanstackRouterImport(createRouteFunction)) {
          return;
        }

        let args: ReadonlyArray<ESTree.Argument> = node.arguments;
        if ((createRouteFunctionsIndirect as ReadonlyArray<string>).includes(createRouteFunction)) {
          if (node.parent.type === "CallExpression") {
            args = node.parent.arguments;
          } else {
            return;
          }
        }

        const argument = args[0];
        if (argument?.type !== "ObjectExpression") {
          return;
        }

        const allProperties = argument.properties;
        if (allProperties.length < 2) {
          return;
        }

        type PropertyEntry = { name: string; property: ESTree.ObjectPropertyKind };
        const properties: PropertyEntry[] = allProperties.flatMap((property): PropertyEntry[] => {
          if (property.type === "Property" && property.key.type === "Identifier") {
            return [{ name: property.key.name, property }];
          }
          if (property.type === "SpreadElement" && property.argument.type === "Identifier") {
            return [{ name: property.argument.name, property }];
          }
          return [];
        });

        // Indices below are within bounds (length >= 2 checked above).
        const propertyAt = (i: number) => allProperties[i] as ESTree.ObjectPropertyKind;
        const sortedProperties = sortDataByOrder<PropertyEntry, "name">(properties, sortRules, "name");
        if (sortedProperties == null) {
          return;
        }

        context.report({
          node: argument,
          data: { function: createRouteFunction },
          messageId: "invalidOrder",
          fix(fixer) {
            const sourceCode = context.sourceCode;
            const text = sortedProperties.reduce((sourceText, specifier, index) => {
              let between = "";
              if (index < allProperties.length - 1) {
                between = sourceCode.getText().slice(propertyAt(index).range[1], propertyAt(index + 1).range[0]);
              }
              return sourceText + sourceCode.getText(specifier.property) + between;
            }, "");

            return fixer.replaceTextRange(
              [propertyAt(0).range[0], propertyAt(allProperties.length - 1).range[1]],
              text,
            );
          },
        });
      },
    };
  },
});
