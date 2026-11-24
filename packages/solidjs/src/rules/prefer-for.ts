import { defineRule, type ESTree, type Fixer } from "@oxlint/plugins";
import { ensureSolidImports } from "../utils/fix-imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { isJSXElementOrFragment } from "../utils/jsx.ts";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";
import { cannotContainJSX } from "../utils/files.ts";

/** `Array(n)` or `new Array(n)` with one argument: the count. */
function arrayOfLength(node: ESTree.Node | null | undefined): ESTree.Node | null {
  if (
    (node?.type === "CallExpression" || node?.type === "NewExpression") &&
    node.callee.type === "Identifier" &&
    node.callee.name === "Array" &&
    node.arguments.length === 1 &&
    node.arguments[0]!.type !== "SpreadElement"
  ) {
    return node.arguments[0]!;
  }
  return null;
}

/** `Array.from({ length: n })`: the count. */
function arrayFromLength(node: ESTree.Node | null | undefined): ESTree.Node | null {
  if (
    node?.type !== "CallExpression" ||
    node.callee.type !== "MemberExpression" ||
    node.callee.object.type !== "Identifier" ||
    node.callee.object.name !== "Array" ||
    getPropertyName(node.callee) !== "from"
  ) {
    return null;
  }
  const arg = node.arguments[0];
  if (arg?.type !== "ObjectExpression" || arg.properties.length !== 1) return null;
  const prop = arg.properties[0]!;
  return prop.type === "Property" && !prop.computed && prop.key.type === "Identifier" && prop.key.name === "length"
    ? prop.value
    : null;
}

/**
 * Version 2 (TASK-053): the count of a count-based list in JSX and its callback, for
 * `Array.from({ length: n }, fn)`, `Array.from({ length: n }).map(fn)`, `[...Array(n)].map(fn)` and
 * `Array(n).fill(x).map(fn)` (also with `new Array`).
 */
function countBasedList(call: ESTree.CallExpression): { count: ESTree.Node; fn: FunctionNode } | null {
  const fromCount = arrayFromLength(call);
  if (fromCount && call.arguments.length === 2 && isFunctionNode(call.arguments[1])) {
    return { count: fromCount, fn: call.arguments[1] as FunctionNode };
  }
  if (call.callee.type !== "MemberExpression" || getPropertyName(call.callee) !== "map") return null;
  if (call.arguments.length !== 1 || !isFunctionNode(call.arguments[0])) return null;
  const fn = call.arguments[0] as FunctionNode;
  const source = call.callee.object;
  const fromMapped = arrayFromLength(source);
  if (fromMapped && source.type === "CallExpression" && source.arguments.length === 1) return { count: fromMapped, fn };
  if (
    source.type === "ArrayExpression" &&
    source.elements.length === 1 &&
    source.elements[0]?.type === "SpreadElement"
  ) {
    const count = arrayOfLength(source.elements[0].argument);
    if (count) return { count, fn };
  }
  if (
    source.type === "CallExpression" &&
    source.callee.type === "MemberExpression" &&
    getPropertyName(source.callee) === "fill"
  ) {
    const count = arrayOfLength(source.callee.object);
    if (count) return { count, fn };
  }
  return null;
}

function getPropertyName(memberExpr: ESTree.MemberExpression): string | null {
  if (!memberExpr?.property) return null;
  if (!memberExpr.computed && memberExpr.property.type === "Identifier") {
    return memberExpr.property.name;
  }
  if (memberExpr.property.type === "Literal" && typeof memberExpr.property.value === "string") {
    return memberExpr.property.value;
  }
  return null;
}

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Enforce using Solid's `<For />` component for mapping an array to JSX elements.",
      recommended: "warn",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/prefer-for.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      preferFor:
        "Use Solid's `<For />` component for efficiently rendering lists. Array#map causes DOM elements to be recreated.",
      preferForOrIndex:
        "Use Solid's `<For />` component or `<Index />` component for rendering lists. Array#map causes DOM elements to be recreated.",
      preferForV2:
        "Use Solid's `<For />` component for rendering lists: Array#map causes DOM elements to be recreated. In Solid 2.0, `<For>` passes the index as an accessor (`i()`), and `<For keyed={false}>` passes the item as an accessor and the index as a number.",
      preferRepeat:
        "Use Solid's `<Repeat count={...}>` for a count-based list: it renders by index without diffing, and its callback receives the index as a number.",
      suggestRepeat: "Replace with `<Repeat>`.",
    },
    hasSuggestions: true,
  },
  createOnce(context) {
    const reportPreferFor = (node: ESTree.CallExpression, callee: ESTree.MemberExpression, mapFnNode: ESTree.Node) => {
      const jsxExpressionContainerNode = node.parent;
      const arrayNode = callee.object;
      context.report({
        node,
        messageId: "preferFor",
        fix: (fixer) => {
          const beforeArray: [number, number] = [jsxExpressionContainerNode.range[0], arrayNode.range[0]];
          const betweenArrayAndMapFn: [number, number] = [arrayNode.range[1], mapFnNode.range[0]];
          const afterMapFn: [number, number] = [mapFnNode.range[1], jsxExpressionContainerNode.range[1]];
          return [
            fixer.replaceTextRange(beforeArray, "<For each={"),
            fixer.replaceTextRange(betweenArrayAndMapFn, "}>{"),
            fixer.replaceTextRange(afterMapFn, "}</For>"),
          ];
        },
      });
    };

    let v2 = false;

    /** Version 2: report a count-based list; suggest <Repeat> when the item parameter is unused. */
    const reportRepeat = (
      node: ESTree.CallExpression,
      container: ESTree.Node,
      count: ESTree.Node,
      fn: FunctionNode,
    ) => {
      const sourceCode = context.sourceCode;
      const [item, index] = fn.params;
      const itemUsed =
        item !== undefined &&
        (item.type !== "Identifier" ||
          (sourceCode.scopeManager?.getDeclaredVariables(fn) ?? []).some(
            (v) => v.name === item.name && v.references.length > 0,
          ));
      const canSuggest =
        fn.type === "ArrowFunctionExpression" &&
        !itemUsed &&
        fn.params.length <= 2 &&
        (!index || index.type === "Identifier");
      const suggest = canSuggest
        ? [
            {
              messageId: "suggestRepeat" as const,
              fix: (fixer: Fixer) => [
                fixer.replaceText(
                  container,
                  `<Repeat count={${sourceCode.getText(count)}}>{(${index ? sourceCode.getText(index) : ""}) => ${sourceCode.getText(fn.body)}}</Repeat>`,
                ),
                ...ensureSolidImports(fixer, sourceCode, ["Repeat"]),
              ],
            },
          ]
        : undefined;
      context.report({ node, messageId: "preferRepeat", ...(suggest ? { suggest } : {}) });
    };

    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        v2 = readSolidVersion(context) === 2;
        return !cannotContainJSX(context.filename);
      },
      CallExpression(node) {
        const callOrChain: ESTree.Node = node.parent.type === "ChainExpression" ? node.parent : node;
        if (
          v2 &&
          callOrChain.parent?.type === "JSXExpressionContainer" &&
          isJSXElementOrFragment(callOrChain.parent.parent)
        ) {
          const list = countBasedList(node);
          if (list) return reportRepeat(node, callOrChain.parent, list.count, list.fn);
        }
        if (
          callOrChain.parent?.type === "JSXExpressionContainer" &&
          isJSXElementOrFragment(callOrChain.parent.parent)
        ) {
          if (
            node.callee.type === "MemberExpression" &&
            getPropertyName(node.callee) === "map" &&
            node.arguments.length === 1 &&
            isFunctionNode(node.arguments[0])
          ) {
            const mapFnNode = node.arguments[0] as FunctionNode; // isFunctionNode checked above
            if (mapFnNode.params.length === 1 && mapFnNode.params[0]?.type !== "RestElement") {
              reportPreferFor(node, node.callee, mapFnNode);
            } else {
              // Version 2 has no <Index> (RFC 03 §Index → For keyed={false}).
              context.report({ node, messageId: v2 ? "preferForV2" : "preferForOrIndex" });
            }
          }
        }
      },
    };
  },
});
