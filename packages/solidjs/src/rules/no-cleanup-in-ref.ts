import { defineRule, type ESTree } from "@oxlint/plugins";
import { cannotContainJSX } from "../utils/files.ts";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";
import { trackImports } from "../utils/imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { SOLID_ANY_MODULE } from "../utils/solid2.ts";
import { walkOwnBody } from "../utils/walk.ts";

// TASK-056. In Solid 2.0, ref callbacks are unowned: getOwner() is null inside them, onCleanup throws,
// and primitives created there are never disposed (MIGRATION §Ref callbacks: no longer owned; RFC 07
// §Two-phase directive factories; RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE, §NO_OWNER_EFFECT).

/** Primitives (and onSettled) that need an owner. */
const NEEDS_OWNER = [
  "createSignal",
  "createMemo",
  "createEffect",
  "createRenderEffect",
  "createTrackedEffect",
  "createReaction",
  "createDeferred",
  "createStore",
  "createProjection",
  "createOptimistic",
  "createOptimisticStore",
  "onSettled",
];

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow onCleanup, getOwner and owned primitives in ref callbacks, which are unowned in Solid 2.0 (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-cleanup-in-ref.md",
    },
    schema: [],
    messages: {
      cleanupInRef:
        "Ref callbacks are unowned in Solid 2.0, so onCleanup here throws CLEANUP_IN_FORBIDDEN_SCOPE. Put the cleanup in an owned scope: return it from onSettled in the component body, or call onCleanup in a directive factory's setup.",
      getOwnerInRef:
        "Ref callbacks are unowned in Solid 2.0: getOwner() returns null here. Read the owner in the component body or in a directive factory's setup.",
      primitiveInRef:
        "Ref callbacks are unowned in Solid 2.0: {{name}} called here has no owner and is never disposed. Call it in the component body or in a directive factory's setup.",
    },
  },
  createOnce(context) {
    const imports = trackImports(SOLID_ANY_MODULE);

    const check = (fn: FunctionNode) => {
      walkOwnBody(fn, (node) => {
        if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
        const name = imports.matchImport(["onCleanup", "getOwner", ...NEEDS_OWNER], node.callee.name);
        if (name === "onCleanup") context.report({ node, messageId: "cleanupInRef" });
        else if (name === "getOwner") context.report({ node, messageId: "getOwnerInRef" });
        else if (name) context.report({ node, messageId: "primitiveInRef", data: { name } });
      });
    };

    /** Inline callbacks of a ref value, including (nested) arrays (RFC 07: arrays compose). */
    const callbacks = (expr: ESTree.Node | null): FunctionNode[] => {
      if (isFunctionNode(expr)) return [expr];
      if (expr?.type === "ArrayExpression") {
        return expr.elements.flatMap((e) => (e && e.type !== "SpreadElement" ? callbacks(e) : []));
      }
      return [];
    };

    return {
      before() {
        imports.clear();
        return !cannotContainJSX(context.filename) && readSolidVersion(context) === 2;
      },
      ImportDeclaration(node) {
        imports.handleImportDeclaration(node);
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "ref") return;
        if (node.value?.type !== "JSXExpressionContainer" || node.value.expression.type === "JSXEmptyExpression")
          return;
        for (const fn of callbacks(node.value.expression)) check(fn);
      },
    };
  },
});
