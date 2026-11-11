import { createTanstackQueryImportTracker } from "../utils/detect-query-imports";
import { ASTUtils } from "../utils/ast-utils";

const QUERY_KEY = "queryKey";
const QUERY_FN = "queryFn";

function uniqueBy<T>(arr: Array<T>, fn: (x: T) => unknown): Array<T> {
  return arr.filter((x, i, a) => a.findIndex((y) => fn(x) === fn(y)) === i);
}

function isInstanceOfKind(node: any): boolean {
  return node?.type === "BinaryExpression" && node.operator === "instanceof";
}

function isRelevantReference(params: {
  sourceCode: any;
  reference: any;
  scopeManager: any;
  node: any;
  filename: string;
}): boolean {
  const { sourceCode, reference, scopeManager, node, filename } = params;
  const component = ASTUtils.getFunctionAncestor(sourceCode, node);

  if (component !== undefined) {
    if (
      !ASTUtils.isDeclaredInNode({
        scopeManager,
        reference,
        functionNode: component,
      })
    ) {
      return false;
    }
  } else {
    const isVueFile = filename.endsWith(".vue");

    if (!isVueFile) {
      return false;
    }

    const definition = reference.resolved?.defs[0];
    const isGlobalVariable = definition === undefined;
    const isImport = definition?.type === "ImportBinding";

    if (isGlobalVariable || isImport) {
      return false;
    }
  }

  return (
    reference.identifier.name !== "undefined" &&
    reference.identifier.parent?.type !== "NewExpression" &&
    !isInstanceOfKind(reference.identifier.parent)
  );
}

function getQueryFnRelevantNode(queryFn: any): any {
  if (queryFn.value?.type !== "ConditionalExpression") {
    return queryFn.value;
  }

  if (
    queryFn.value.consequent?.type === "Identifier" &&
    queryFn.value.consequent.name === "skipToken"
  ) {
    return queryFn.value.alternate;
  }

  return queryFn.value.consequent;
}

function dereferenceVariablesAndTypeAssertions(queryKeyNode: any, context: any): any {
  const visitedNodes = new Set<any>();

  for (let i = 0; i < 256; ++i) {
    if (visitedNodes.has(queryKeyNode)) {
      return queryKeyNode;
    }
    visitedNodes.add(queryKeyNode);

    switch (queryKeyNode.type) {
      case "TSAsExpression":
        queryKeyNode = queryKeyNode.expression;
        break;
      case "Identifier": {
        const expression = ASTUtils.getReferencedExpressionByIdentifier({
          context,
          node: queryKeyNode,
        });

        if (expression == null) {
          return queryKeyNode;
        }
        queryKeyNode = expression;
        break;
      }
      default:
        return queryKeyNode;
    }
  }
  return queryKeyNode;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Exhaustive deps rule for useQuery",
      recommended: "error",
    },
    messages: {
      missingDeps: "The following dependencies are missing in your queryKey: {{deps}}",
      fixTo: "Fix to {{result}}",
    },
    hasSuggestions: true,
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
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

      Property(node: any) {
        if (
          !ASTUtils.isObjectExpression(node.parent) ||
          !ASTUtils.isIdentifierWithName(node.key, QUERY_KEY)
        ) {
          return;
        }

        const scopeManager = context.sourceCode?.scopeManager;
        const queryKey = ASTUtils.findPropertyWithIdentifierKey(node.parent.properties, QUERY_KEY);
        const queryFn = ASTUtils.findPropertyWithIdentifierKey(node.parent.properties, QUERY_FN);

        if (
          scopeManager == null ||
          queryKey === undefined ||
          queryFn === undefined
        ) {
          return;
        }

        const queryFnValueType = queryFn.value?.type;
        if (
          queryFnValueType !== "ArrowFunctionExpression" &&
          queryFnValueType !== "FunctionExpression" &&
          queryFnValueType !== "ConditionalExpression"
        ) {
          return;
        }

        const queryKeyNode = dereferenceVariablesAndTypeAssertions(queryKey.value, context);
        const queryFnNode = getQueryFnRelevantNode(queryFn);

        const externalRefs = ASTUtils.getExternalRefs({
          scopeManager,
          sourceCode: context.sourceCode,
          node: queryFnNode,
        });

        const relevantRefs = externalRefs.filter((reference: any) =>
          isRelevantReference({
            sourceCode: context.sourceCode,
            reference,
            scopeManager,
            node: queryFnNode,
            filename: context.filename,
          }),
        );

        const existingKeys = ASTUtils.getNestedIdentifiers(queryKeyNode).map((identifier: any) =>
          ASTUtils.mapKeyNodeToBaseText(identifier, context.sourceCode),
        );

        const missingRefs = relevantRefs
          .map((ref: any) => ({
            ref,
            text: ASTUtils.mapKeyNodeToBaseText(ref.identifier, context.sourceCode),
          }))
          .filter(({ ref, text }: any) => {
            return (
              !ref.isTypeReference &&
              !ASTUtils.isAncestorIsCallee(ref.identifier) &&
              !existingKeys.some((existingKey: string) => existingKey === text) &&
              !existingKeys.includes(text.split(/[?.]/)[0] ?? "")
            );
          })
          .map(({ ref, text }: any) => ({
            identifier: ref.identifier,
            text,
          }));

        const uniqueMissingRefs = uniqueBy(missingRefs, (x: any) => x.text);

        if (uniqueMissingRefs.length > 0) {
          const missingAsText = uniqueMissingRefs
            .map((ref: any) => ASTUtils.mapKeyNodeToText(ref.identifier, context.sourceCode))
            .join(", ");

          const queryKeyValue = context.sourceCode.getText(queryKeyNode);

          const existingWithMissing =
            queryKeyValue === "[]"
              ? `[${missingAsText}]`
              : queryKeyValue.replace(/\]$/, `, ${missingAsText}]`);

          const suggestions: Array<any> = [];

          if (queryKeyNode.type === "ArrayExpression") {
            suggestions.push({
              messageId: "fixTo",
              data: { result: existingWithMissing },
              fix(fixer: any) {
                return fixer.replaceText(queryKeyNode, existingWithMissing);
              },
            });
          }

          context.report({
            node,
            messageId: "missingDeps",
            data: {
              deps: uniqueMissingRefs.map((ref: any) => ref.text).join(", "),
            },
            suggest: suggestions,
          });
        }
      },
    };
  },
};
