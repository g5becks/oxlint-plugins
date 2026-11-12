import { defineRule, type ESTree, type RuleMeta } from "@oxlint/plugins";
import { createTanstackQueryImportTracker } from "./detect-query-imports.ts";
import { sortDataByOrder } from "./sort-data-by-order.ts";

type RuleDefinition = {
  name: string;
  meta: RuleMeta;
};

export function createPropertyOrderRule<TFunc extends string, TProp extends string>(
  options: RuleDefinition,
  targetFunctions: ReadonlyArray<TFunc> | Array<TFunc>,
  orderRules: ReadonlyArray<Readonly<[ReadonlyArray<TProp>, ReadonlyArray<TProp>]>>,
) {
  const targetFunctionSet: ReadonlySet<string> = new Set<string>(targetFunctions);

  return defineRule({
    meta: options.meta,
    createOnce(context) {
      const tracker = createTanstackQueryImportTracker();

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

          const functionName = node.callee.name;
          if (!targetFunctionSet.has(functionName) || !tracker.isTanstackQueryImportByName(functionName)) {
            return;
          }

          const argument = node.arguments[0];
          if (argument?.type !== "ObjectExpression") {
            return;
          }

          const allProperties = argument.properties;
          if (allProperties.length < 2) {
            return;
          }

          // Indices below are within bounds (length >= 2 checked above).
          const propertyAt = (i: number) => allProperties[i] as ESTree.ObjectPropertyKind;
          const properties = allProperties.map((property, index) => {
            if (property.type === "Property" && property.key.type === "Identifier") {
              return { name: property.key.name, property };
            }

            return { name: `_property_${index}`, property };
          });

          const sortedProperties = sortDataByOrder<{ name: string; property: ESTree.ObjectPropertyKind }, "name">(
            properties,
            // Property names outside TProp simply match no rule.
            orderRules as ReadonlyArray<Readonly<[ReadonlyArray<string>, ReadonlyArray<string>]>>,
            "name",
          );
          if (sortedProperties == null) {
            return;
          }

          context.report({
            node: argument,
            data: { function: functionName },
            messageId: "invalidOrder",
            fix(fixer) {
              const sourceCode = context.sourceCode;

              const reorderedText = sortedProperties.reduce((sourceText, specifier, index) => {
                let textBetweenProperties = "";
                if (index < allProperties.length - 1) {
                  textBetweenProperties = sourceCode
                    .getText()
                    .slice(propertyAt(index).range[1], propertyAt(index + 1).range[0]);
                }

                return sourceText + sourceCode.getText(specifier.property) + textBetweenProperties;
              }, "");

              return fixer.replaceTextRange(
                [propertyAt(0).range[0], propertyAt(allProperties.length - 1).range[1]],
                reorderedText,
              );
            },
          });
        },
      };
    },
  });
}
