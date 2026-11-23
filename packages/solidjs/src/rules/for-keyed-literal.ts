import { defineRule, type ESTree } from "@oxlint/plugins";
import { isFunctionNode } from "../utils/functions.ts";
import { trackImports } from "../utils/imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { SOLID_ANY_MODULE } from "../utils/solid2.ts";

// TASK-057. Solid 2.0's <For> callback shape depends on its keying mode: raw item + index accessor by
// default, item accessor + numeric index with keyed={false}, both accessors with a key function. A
// dynamic boolean makes the shape unknowable (MIGRATION §List rendering; RFC 03 §List rendering).

/** Expression forms whose value is a (dynamic) boolean rather than a key function. */
const DYNAMIC_BOOLEAN = new Set(["CallExpression", "BinaryExpression", "LogicalExpression", "ConditionalExpression"]);

const isDynamicBoolean = (node: ESTree.Node): boolean =>
  DYNAMIC_BOOLEAN.has(node.type) || (node.type === "UnaryExpression" && node.operator === "!");

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow a dynamic boolean `keyed` on <For> (and mapArray) with function children (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/for-keyed-literal.md",
    },
    schema: [],
    messages: {
      dynamicKeyed:
        "A dynamic `keyed` value makes the callback's argument shapes ambiguous in Solid 2.0 (a raw item or an accessor). Use `keyed`, `keyed={false}` or a key function.",
    },
  },
  createOnce(context) {
    const imports = trackImports(SOLID_ANY_MODULE);
    return {
      before() {
        imports.clear();
        return readSolidVersion(context) === 2;
      },
      ImportDeclaration(node) {
        imports.handleImportDeclaration(node);
      },
      JSXElement(node) {
        const name = node.openingElement.name;
        if (name.type !== "JSXIdentifier" || !imports.matchImport("For", name.name)) return;
        const hasFunctionChild = node.children.some(
          (c) => c.type === "JSXExpressionContainer" && isFunctionNode(c.expression as ESTree.Node),
        );
        if (!hasFunctionChild) return;
        for (const attr of node.openingElement.attributes) {
          if (attr.type !== "JSXAttribute" || attr.name.type !== "JSXIdentifier" || attr.name.name !== "keyed")
            continue;
          const value = attr.value;
          if (value?.type === "JSXExpressionContainer" && value.expression.type !== "JSXEmptyExpression") {
            if (isDynamicBoolean(value.expression)) context.report({ node: attr, messageId: "dynamicKeyed" });
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !imports.matchImport("mapArray", node.callee.name)) return;
        const options = node.arguments[2];
        if (options?.type !== "ObjectExpression" || !isFunctionNode(node.arguments[1])) return;
        for (const p of options.properties) {
          if (p.type === "Property" && !p.computed && p.key.type === "Identifier" && p.key.name === "keyed") {
            if (isDynamicBoolean(p.value)) context.report({ node: p, messageId: "dynamicKeyed" });
          }
        }
      },
    };
  },
});
