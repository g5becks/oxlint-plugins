import { defineRule, type ESTree, type Fixer } from "@oxlint/plugins";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";
import { trackImports } from "../utils/imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { SOLID_ANY_MODULE } from "../utils/solid2.ts";
import { trace } from "../utils/trace.ts";
import { walkTree } from "../utils/walk.ts";

// TASK-046. Solid 2.0's split-effect contract (settings.solidjs.version 2 only). Sources: MIGRATION
// §Effects, lifecycle, and cleanup; RFC 01 §Split tracking from effect, §createTrackedEffect and
// onSettled; RFC 08 §MISSING_EFFECT_FN, §Invalid cleanup return value, §CLEANUP_IN_FORBIDDEN_SCOPE,
// §PRIMITIVE_IN_FORBIDDEN_SCOPE. See docs/rules/effect-split.md.

/** Primitives that createTrackedEffect and onSettled can't create (RFC 08 §PRIMITIVE_IN_FORBIDDEN_SCOPE). */
const PRIMITIVES = [
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
];

/** Array methods whose callback runs in place (part of the enclosing function's body). */
const SYNC_METHODS = /^(?:forEach|map|flatMap|reduce|reduceRight|find|findIndex|filter|every|some)$/;

/** Expression forms whose value is never a function or undefined. */
const NOT_A_CLEANUP = new Set([
  "AssignmentExpression",
  "Literal",
  "TemplateLiteral",
  "ObjectExpression",
  "ArrayExpression",
  "BinaryExpression",
  "UpdateExpression",
  "NewExpression",
  "JSXElement",
  "JSXFragment",
]);

function isNeverCleanup(node: ESTree.Node | null | undefined): boolean {
  if (!node) return false;
  if (node.type === "UnaryExpression") return node.operator !== "void";
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression") {
    return isNeverCleanup(node.expression);
  }
  return NOT_A_CLEANUP.has(node.type);
}

const PRIMITIVE_NAMES = new Set(PRIMITIVES);

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce Solid 2.0's split effects (compute + apply) and its cleanup rules (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/effect-split.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      missingApply:
        "In Solid 2.0, {{name}} takes a compute function and an apply function: `{{name}}(() => source(), (value) => { ... })`. A single function throws MISSING_EFFECT_FN.",
      initialValue:
        "The 1.x initial value is gone: the second argument of {{name}} is the apply function (or an EffectBundle). Use a default parameter in the compute: `(prev = initial) => ...`.",
      memoInitialValue:
        "The second argument of createMemo is an options object in Solid 2.0, not an initial value. Use a default parameter: `(prev = initial) => ...`.",
      invalidCleanup:
        'This {{scope}} returns a value that isn\'t a cleanup function, which Solid 2.0 rejects ("callback returned an invalid cleanup value"). Return a function or nothing.',
      asyncCallback:
        "This {{scope}} is async, so it returns a Promise, which Solid 2.0 rejects as a cleanup value. Do the async work in an action or the compute function.",
      cleanupInScope:
        "Don't call onCleanup in {{scope}}: Solid 2.0 throws CLEANUP_IN_FORBIDDEN_SCOPE. Return the cleanup function instead.",
      cleanupInLegacyEffect:
        "When this effect is split for Solid 2.0, return this cleanup from the apply function instead of calling onCleanup.",
      primitiveInLeaf:
        "{{scope}} can't create {{primitive}}: Solid 2.0 throws PRIMITIVE_IN_FORBIDDEN_SCOPE. Create it in the component body and use it here.",
    },
  },
  createOnce(context) {
    const imports = trackImports(SOLID_ANY_MODULE);

    /** The Solid API a callee names, if any. */
    const solidName = (callee: ESTree.Node, names: string[]): string | undefined =>
      callee.type === "Identifier" ? imports.matchImport(names, callee.name) : undefined;

    /** Visit a function's own body, including callbacks that run in place, but not functions that run later. */
    const walkOwnBody = (fn: FunctionNode, visit: (node: ESTree.Node) => void) => {
      if (!fn.body) return;
      walkTree(fn.body, (node, skip) => {
        if (isFunctionNode(node)) {
          const parent = node.parent;
          const inPlace =
            parent?.type === "CallExpression" &&
            (parent.callee === node ||
              (parent.callee.type === "MemberExpression" &&
                !parent.callee.computed &&
                parent.callee.property.type === "Identifier" &&
                SYNC_METHODS.test(parent.callee.property.name)));
          if (!inPlace) return skip();
        }
        visit(node);
      });
    };

    /** onCleanup and primitive calls in a function's own body. */
    const checkBody = (fn: FunctionNode, scope: string, leaf: boolean, legacy = false) => {
      walkOwnBody(fn, (node) => {
        if (node.type !== "CallExpression") return;
        if (solidName(node.callee, ["onCleanup"])) {
          context.report({ node, messageId: legacy ? "cleanupInLegacyEffect" : "cleanupInScope", data: { scope } });
        } else if (leaf) {
          const primitive = solidName(node.callee, PRIMITIVES);
          if (primitive && PRIMITIVE_NAMES.has(primitive)) {
            context.report({ node, messageId: "primitiveInLeaf", data: { scope, primitive } });
          }
        }
      });
    };

    /** What an effect-phase callback returns: it must be a cleanup function or nothing. */
    const checkReturn = (fn: FunctionNode, scope: string) => {
      if (fn.async || fn.generator) {
        context.report({ node: fn, messageId: "asyncCallback", data: { scope } });
        return;
      }
      if (fn.type === "ArrowFunctionExpression" && fn.body && fn.body.type !== "BlockStatement") {
        if (!isNeverCleanup(fn.body)) return;
        const body = fn.body;
        context.report({
          node: body,
          messageId: "invalidCleanup",
          data: { scope },
          // Behavior-preserving: the value was never a valid cleanup.
          fix: (fixer: Fixer) => {
            const sourceCode = context.sourceCode;
            const arrow = sourceCode.getTokenBefore(body, { filter: (t) => t.value === "=>" });
            const start = arrow && sourceCode.getTokenAfter(arrow);
            if (!start) return null;
            // The text after `=>` as written, parentheses included: `() => ({ a })` stays an object.
            const text = sourceCode.text.slice(start.range[0], fn.range[1]);
            return fixer.replaceTextRange([start.range[0], fn.range[1]], `{ ${text}; }`);
          },
        });
        return;
      }
      walkOwnBody(fn, (node) => {
        if (node.type === "ReturnStatement" && isNeverCleanup(node.argument)) {
          context.report({ node, messageId: "invalidCleanup", data: { scope } });
        }
      });
    };

    /** A second argument that is a 1.x initial value rather than an apply function or EffectBundle. */
    const isInitialValue = (arg: ESTree.Node): boolean => {
      const traced = trace(arg, context);
      if (!traced || isFunctionNode(traced)) return false;
      if (traced.type === "ObjectExpression") return false;
      return isNeverCleanup(traced) || traced.type === "ArrayExpression" || traced.type === "Literal";
    };

    return {
      before() {
        imports.clear();
        // Only Solid 2.0 splits effects: the rule runs at settings.solidjs.version 2.
        return readSolidVersion(context) === 2;
      },
      ImportDeclaration(node) {
        imports.handleImportDeclaration(node);
      },
      CallExpression(node) {
        const name = solidName(node.callee, [
          "createEffect",
          "createRenderEffect",
          "createMemo",
          "createTrackedEffect",
          "onSettled",
        ]);
        if (!name) return;
        const [arg0, arg1] = node.arguments;

        if (name === "createMemo") {
          if (arg1 && arg1.type !== "SpreadElement" && isInitialValue(arg1)) {
            context.report({ node: arg1, messageId: "memoInitialValue" });
          }
          return;
        }

        if (name === "createTrackedEffect" || name === "onSettled") {
          if (isFunctionNode(arg0)) {
            checkReturn(arg0, `${name} callback`);
            checkBody(arg0, name, true);
          }
          return;
        }

        // createEffect / createRenderEffect
        if (!arg1) {
          context.report({ node, messageId: "missingApply", data: { name } });
          if (isFunctionNode(arg0)) checkBody(arg0, name, false, true);
          return;
        }
        if (arg1.type === "SpreadElement") return;
        if (isFunctionNode(arg1)) {
          checkReturn(arg1, "apply function");
          checkBody(arg1, "an effect's apply function", false);
        } else if (arg1.type === "ObjectExpression") {
          for (const property of arg1.properties) {
            if (property.type === "Property" && isFunctionNode(property.value)) {
              checkReturn(property.value, "apply function");
              checkBody(property.value, "an effect's apply function", false);
            }
          }
        } else if (isInitialValue(arg1)) {
          context.report({ node: arg1, messageId: "initialValue", data: { name } });
        }
      },
    };
  },
});
