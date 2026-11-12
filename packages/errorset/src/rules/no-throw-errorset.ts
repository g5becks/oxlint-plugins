import { defineRule, type ESTree } from "@oxlint/plugins";
/**
 * Rule: no-throw-errorset
 *
 * Disallows throwing errorset values. They are return values, not exceptions.
 *
 * ❌ throw UserError.not_found`User ${"id"} not found`({ id })
 * ✅ return UserError.not_found`User ${"id"} not found`({ id })
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts";
import { readErrorsetSettings } from "../utils/settings.ts";
import {
  getErrorsetTag,
  getMemberObjectName,
  unwrapWith,
  CAPTURE_METHODS,
  nodeName,
} from "../utils/pattern-helpers.ts";

/**
 * Returns true when the ThrowStatement's argument is an errorset creation expression
 * (either a tagged template or a call wrapping a tagged template).
 */
function getCreationObjectName(node: ESTree.ThrowStatement, guardNames: Set<string>): string | null {
  // Pattern C (errorset >= 0.4): throw SomeError.kind`...`.with({ cause })
  let candidate = unwrapWith(node.argument);
  if (!candidate) return null;

  // Pattern A: throw SomeError.kind`...`(data) — CallExpression wrapping TTE
  if (candidate.type === "CallExpression" && candidate.callee.type === "TaggedTemplateExpression") {
    candidate = candidate.callee;
  }

  // Pattern B: throw SomeError.kind`...` — bare TaggedTemplateExpression
  if (candidate.type !== "TaggedTemplateExpression") return null;

  const tag = getErrorsetTag(candidate);
  const objName = getMemberObjectName(tag);
  if (!objName) return null;
  return guardNames.has(objName) ? objName : null;
}

/**
 * Returns true when the node is inside the first argument (the target function)
 * of a .capture() or .captureAsync() call — those throw intentionally.
 */
function isInsideCaptureTarget(
  node: ESTree.Node,
  guardNames: Set<string>,
  isCaptureHelper: (name: string) => boolean = () => false,
): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current) {
    const isMemberCapture =
      current.type === "CallExpression" &&
      current.callee.type === "MemberExpression" &&
      CAPTURE_METHODS.has(nodeName(current.callee.property) ?? "") &&
      current.callee.object.type === "Identifier" &&
      guardNames.has(current.callee.object.name);
    // errorset >= 0.4 top-level helpers: captureSync(fn, map) / captureAsync(fn, map)
    const isHelperCapture =
      current.type === "CallExpression" && current.callee.type === "Identifier" && isCaptureHelper(current.callee.name);
    if (isMemberCapture || isHelperCapture) {
      // We're inside a .capture() call — check if we're in the first arg (target fn)
      const firstArg = current.type === "CallExpression" ? current.arguments[0] : undefined;
      if (firstArg && (firstArg.type === "ArrowFunctionExpression" || firstArg.type === "FunctionExpression")) {
        // Check if the current node's ancestry includes this firstArg
        let inner: ESTree.Node | null = node.parent;
        while (inner && inner !== current) {
          if (inner === firstArg) return true;
          inner = inner.parent;
        }
      }
    }
    current = current.parent;
  }
  return false;
}

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
/** Statements a throw may sit in while still being "directly" in the function body. */
const TRANSPARENT = new Set(["BlockStatement", "IfStatement"]);

/**
 * Whether rewriting `throw` to `return` keeps the function's control flow (audit R3):
 * the throw must be directly in the body of its enclosing function (only blocks and
 * `if`/`else` in between: no loop, `switch`, `try`/`catch`/`finally` or label), and that
 * function must not be a callback passed to a call (where `return` would hand the error
 * value to the caller, e.g. into the array built by `.map`).
 */
function isDirectThrow(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current && !FUNCTION_TYPES.has(current.type)) {
    if (!TRANSPARENT.has(current.type)) return false;
    current = current.parent;
  }
  if (!current) return false;
  const parent = current.parent;
  if ((parent?.type === "CallExpression" || parent?.type === "NewExpression") && parent.callee !== current) {
    return false;
  }
  return true;
}

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow throwing errorset values. Errorset values are return values, not exceptions. Use `return` instead of `throw`.",
      recommended: "error",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      noThrow: "Do not throw errorset values. Return them instead: return {{name}}.{{kind}}(...)",
      noThrowGeneric: "Do not throw errorset values. Errorset values are returned, not thrown.",
      suggestReturn: "Return the errorset value instead of throwing it.",
    },
  },
  createOnce(context) {
    const tracker = createErrorsetImportTracker();

    return {
      before() {
        tracker.reset(readErrorsetSettings(context));
      },
      Program() {
        tracker.reset(readErrorsetSettings(context));
      },
      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);
      },
      VariableDeclaration(node) {
        tracker.handleVariableDeclaration(node);
      },
      ThrowStatement(node) {
        if (!tracker.hasErrorsetImport()) return;
        const guardNames = tracker.guardNames();
        if (guardNames.size === 0) return;

        // Don't report inside .capture() target function args
        const isCaptureHelper = (name: string) =>
          tracker.isErrorsetExport(name, "captureSync") || tracker.isErrorsetExport(name, "captureAsync");
        if (isInsideCaptureTarget(node, guardNames, isCaptureHelper)) return;

        const objName = getCreationObjectName(node, guardNames);
        if (!objName) return;

        // Extract kind name for the message
        let kindName = "kind";
        let argument = unwrapWith(node.argument);
        if (argument?.type === "CallExpression" && argument.callee?.type === "TaggedTemplateExpression") {
          argument = argument.callee;
        }
        if (
          argument?.type === "TaggedTemplateExpression" &&
          argument.tag?.type === "MemberExpression" &&
          argument.tag.property?.type === "Identifier"
        ) {
          kindName = argument.tag.property.name;
        }

        // Never an autofix: `oxlint --fix` must not change control flow. A suggestion is
        // offered only where `return` is equivalent for the caller (audit R3).
        context.report({
          node,
          messageId: "noThrow",
          data: { name: objName, kind: kindName },
          suggest: isDirectThrow(node)
            ? [
                {
                  messageId: "suggestReturn",
                  fix: (fixer) => {
                    const sourceCode = context.sourceCode;
                    const argText = sourceCode.getText(node.argument);
                    // Preserve the trailing semicolon if the ThrowStatement range includes one.
                    const trailingSemi = sourceCode.getText(node).endsWith(";") ? ";" : "";
                    return fixer.replaceText(node, `return ${argText}${trailingSemi}`);
                  },
                },
              ]
            : [],
        });
      },
    };
  },
});
