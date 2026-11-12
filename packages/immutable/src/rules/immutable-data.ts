import { defineRule, type ESTree } from "@oxlint/plugins";
import { isIgnoredViaIdentifierPattern } from "../utils/ignore.ts";
import { ruleOptions } from "../utils/options.ts";

type RuleOptions = [
  {
    ignoreClasses?: boolean;
    ignoreMapsAndSets?: boolean;
    ignoreImmediateMutation?: boolean;
    ignoreNonConstDeclarations?: boolean;
    ignoreIdentifierPattern?: string | Array<string>;
  }?,
];

const arrayMutators = new Set(["copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"]);
const mapAndSetMutators = new Set(["add", "clear", "delete", "set"]);

function isInsideClass(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current) {
    if (current.type === "ClassBody" || current.type === "ClassDeclaration" || current.type === "ClassExpression") {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isImmediateMutation(node: ESTree.Node): boolean {
  const root = findRootExpression(node);
  return root.type === "ObjectExpression" || root?.type === "ArrayExpression";
}

function findRootExpression(node: ESTree.Node): ESTree.Node {
  let current = node;
  while (current.type === "MemberExpression") {
    current = current.object;
  }
  return current;
}

function getMutatorName(node: ESTree.CallExpression): string | null {
  if (node.callee.type !== "MemberExpression") {
    return null;
  }
  if (node.callee.property.type === "Identifier") {
    return node.callee.property.name;
  }
  return null;
}

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Disallow mutating existing data structures.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          ignoreClasses: { type: "boolean" },
          ignoreMapsAndSets: { type: "boolean" },
          ignoreImmediateMutation: { type: "boolean" },
          ignoreNonConstDeclarations: { type: "boolean" },
          ignoreIdentifierPattern: {
            anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      generic: "Modifying an existing object/array is not allowed.",
      object: "Modifying properties of an existing object is not allowed.",
      array: "Modifying an array is not allowed.",
      map: "Modifying a map is not allowed.",
      set: "Modifying a set is not allowed.",
      // `clear` and `delete` exist on both Map and Set; without a type checker we can't distinguish.
      mapOrSet: "Modifying a map or set is not allowed.",
    },
    defaultOptions: [
      {
        ignoreClasses: false,
        ignoreMapsAndSets: false,
        // The effective default (the rule reads a missing option as false). Upstream's is true; see TASK-041.
        ignoreImmediateMutation: false,
        ignoreNonConstDeclarations: false,
      },
    ],
  },
  createOnce(context) {
    const getOpts = () => ruleOptions<NonNullable<RuleOptions[0]>>(context) ?? {};

    const shouldIgnoreNode = (node: ESTree.Node): boolean => {
      const options = getOpts();
      if (options?.ignoreClasses && isInsideClass(node)) {
        return true;
      }
      if (options?.ignoreImmediateMutation && isImmediateMutation(node)) {
        return true;
      }
      if (isIgnoredViaIdentifierPattern(findRootExpression(node), options?.ignoreIdentifierPattern)) {
        return true;
      }
      return false;
    };

    return {
      AssignmentExpression(node) {
        if (node.left.type !== "MemberExpression" || shouldIgnoreNode(node.left)) {
          return;
        }
        context.report({ node, messageId: "generic" });
      },
      UnaryExpression(node) {
        if (
          node.operator !== "delete" ||
          node.argument.type !== "MemberExpression" ||
          shouldIgnoreNode(node.argument)
        ) {
          return;
        }
        context.report({ node, messageId: "generic" });
      },
      UpdateExpression(node) {
        if (node.argument.type !== "MemberExpression" || shouldIgnoreNode(node.argument)) {
          return;
        }
        context.report({ node, messageId: "generic" });
      },
      CallExpression(node) {
        const mutator = getMutatorName(node);
        if (!mutator || node.callee.type !== "MemberExpression" || shouldIgnoreNode(node.callee)) {
          return;
        }

        if (arrayMutators.has(mutator)) {
          context.report({ node, messageId: "array" });
          return;
        }

        if (mapAndSetMutators.has(mutator)) {
          if (getOpts()?.ignoreMapsAndSets) {
            return;
          }
          // `add` is a Set-only method → "set"
          // `set` is a Map-only method → "map"
          // `clear` and `delete` exist on both; without a type checker we can't distinguish → "mapOrSet"
          let messageId: string;
          if (mutator === "add") {
            messageId = "set";
          } else if (mutator === "set") {
            messageId = "map";
          } else {
            messageId = "mapOrSet";
          }
          context.report({ node, messageId });
        }
      },
    };
  },
});
