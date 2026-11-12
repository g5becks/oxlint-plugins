import {
  type Context,
  defineRule,
  type ESTree,
  type Reference,
  type ScopeManager,
  type SourceCode,
  type Suggestion,
} from "@oxlint/plugins";
import { createTanstackQueryImportTracker } from "../utils/detect-query-imports.ts";
import { ASTUtils } from "../utils/ast-utils.ts";

const QUERY_KEY = "queryKey";
const QUERY_FN = "queryFn";

function uniqueBy<T>(arr: Array<T>, fn: (x: T) => unknown): Array<T> {
  return arr.filter((x, i, a) => a.findIndex((y) => fn(x) === fn(y)) === i);
}

function isInstanceOfKind(node: ESTree.Node | null | undefined): boolean {
  return node?.type === "BinaryExpression" && node.operator === "instanceof";
}

function isRelevantReference(params: {
  sourceCode: SourceCode;
  reference: Reference;
  scopeManager: ScopeManager;
  node: ESTree.Node;
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

function getQueryFnRelevantNode(queryFn: ESTree.ObjectProperty): ESTree.Node {
  if (queryFn.value.type !== "ConditionalExpression") {
    return queryFn.value;
  }

  if (queryFn.value.consequent.type === "Identifier" && queryFn.value.consequent.name === "skipToken") {
    return queryFn.value.alternate;
  }

  return queryFn.value.consequent;
}

function dereferenceVariablesAndTypeAssertions(queryKeyNode: ESTree.Node, context: Context): ESTree.Node {
  const visitedNodes = new Set<ESTree.Node>();

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

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Exhaustive deps rule for useQuery",
      recommended: "error",
    },
    messages: {
      missingDeps: "The following dependencies are missing in your queryKey: {{deps}}",
      fixTo: "Fix to {{result}}",
    },
    hasSuggestions: true,
    fixable: "code" as const,
    schema: [],
  },
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

      Property(node) {
        if (!ASTUtils.isObjectExpression(node.parent) || !ASTUtils.isIdentifierWithName(node.key, QUERY_KEY)) {
          return;
        }

        const scopeManager = context.sourceCode.scopeManager;
        const queryKey = ASTUtils.findPropertyWithIdentifierKey(node.parent.properties, QUERY_KEY);
        const queryFn = ASTUtils.findPropertyWithIdentifierKey(node.parent.properties, QUERY_FN);

        if (scopeManager == null || queryKey === undefined || queryFn === undefined) {
          return;
        }

        const queryFnValueType = queryFn.value.type;
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

        const relevantRefs = externalRefs.filter((reference) =>
          isRelevantReference({
            sourceCode: context.sourceCode,
            reference,
            scopeManager,
            node: queryFnNode,
            filename: context.filename,
          }),
        );

        const existingKeys = ASTUtils.getNestedIdentifiers(queryKeyNode).map((identifier) =>
          ASTUtils.mapKeyNodeToBaseText(identifier, context.sourceCode),
        );

        const missingRefs = relevantRefs
          .map((ref) => ({
            ref,
            text: ASTUtils.mapKeyNodeToBaseText(ref.identifier, context.sourceCode),
          }))
          .filter(({ ref, text }) => {
            return (
              // typescript-eslint's scope manager marks type-only references (not in oxlint's types).
              !(ref as Reference & { isTypeReference?: boolean }).isTypeReference &&
              !ASTUtils.isAncestorIsCallee(ref.identifier) &&
              !existingKeys.some((existingKey) => existingKey === text) &&
              !existingKeys.includes(text.split(/[?.]/)[0] ?? "")
            );
          })
          .map(({ ref, text }) => ({
            identifier: ref.identifier,
            text,
          }));

        const uniqueMissingRefs = uniqueBy(missingRefs, (x) => x.text);

        if (uniqueMissingRefs.length > 0) {
          const missingAsText = uniqueMissingRefs
            .map((ref) => ASTUtils.mapKeyNodeToText(ref.identifier, context.sourceCode))
            .join(", ");

          const queryKeyValue = context.sourceCode.getText(queryKeyNode);

          const existingWithMissing =
            queryKeyValue === "[]" ? `[${missingAsText}]` : queryKeyValue.replace(/\]$/, `, ${missingAsText}]`);

          const suggestions: Array<Suggestion> = [];

          if (queryKeyNode.type === "ArrayExpression") {
            suggestions.push({
              messageId: "fixTo",
              data: { result: existingWithMissing },
              fix(fixer) {
                return fixer.replaceText(queryKeyNode, existingWithMissing);
              },
            });
          }

          // Report on the options object, like upstream @tanstack/eslint-plugin-query >= 5.107
          // (5.91.4 reported on the queryKey property), so squiggles and disable comments match.
          context.report({
            node: node.parent,
            messageId: "missingDeps",
            data: {
              deps: uniqueMissingRefs.map((ref) => ref.text).join(", "),
            },
            suggest: suggestions,
          });
        }
      },
    };
  },
});
