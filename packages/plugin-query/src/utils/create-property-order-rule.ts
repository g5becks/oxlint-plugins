import { createTanstackQueryImportTracker } from "./detect-query-imports";
import { sortDataByOrder } from "./sort-data-by-order";

type RuleMeta = {
  type: string;
  docs: { description: string; recommended: string };
  messages: Record<string, string>;
  schema: Array<any>;
  hasSuggestions?: boolean;
  fixable?: string;
};

type RuleDefinition = {
  name: string;
  meta: RuleMeta;
  defaultOptions: Array<any>;
};

export function createPropertyOrderRule<TFunc extends string, TProp extends string>(
  options: RuleDefinition,
  targetFunctions: ReadonlyArray<TFunc> | Array<TFunc>,
  orderRules: ReadonlyArray<Readonly<[ReadonlyArray<TProp>, ReadonlyArray<TProp>]>>,
) {
  const targetFunctionSet = new Set(targetFunctions);

  return {
    meta: options.meta,
    defaultOptions: options.defaultOptions,
    createOnce(context: any) {
      const tracker = createTanstackQueryImportTracker();

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

          const functionName = node.callee.name;
          if (!targetFunctionSet.has(functionName) || !tracker.isTanstackQueryImportByName(functionName)) {
            return;
          }

          const argument = node.arguments?.[0];
          if (argument?.type !== "ObjectExpression") {
            return;
          }

          const allProperties = argument.properties ?? [];
          if (allProperties.length < 2) {
            return;
          }

          const properties = allProperties.map((property: any, index: number) => {
            if (property?.type === "Property" && property.key?.type === "Identifier") {
              return { name: property.key.name, property };
            }

            return { name: `_property_${index}`, property };
          });

          const sortedProperties = sortDataByOrder(properties, orderRules as any, "name");
          if (sortedProperties == null) {
            return;
          }

          context.report({
            node: argument,
            data: { function: functionName },
            messageId: "invalidOrder",
            fix(fixer: any) {
              const sourceCode = context.sourceCode;

              const reorderedText = sortedProperties.reduce((sourceText: string, specifier: any, index: number) => {
                let textBetweenProperties = "";
                if (index < allProperties.length - 1) {
                  textBetweenProperties = sourceCode
                    .getText()
                    .slice(allProperties[index].range[1], allProperties[index + 1].range[0]);
                }

                return sourceText + sourceCode.getText(specifier.property) + textBetweenProperties;
              }, "");

              return fixer.replaceTextRange(
                [allProperties[0].range[0], allProperties.at(-1).range[1]],
                reorderedText,
              );
            },
          });
        },
      };
    },
  };
}
