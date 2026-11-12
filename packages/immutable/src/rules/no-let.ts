import { defineRule, type ESTree } from "@oxlint/plugins";
import { shouldIgnorePattern } from "../utils/ignore.ts";
import { getEnclosingFunction, isInForLoopInitializer, isInFunctionBody } from "../utils/tree.ts";
import { ruleOptions } from "../utils/options.ts";

type RuleOptions = [
  { allowInForLoopInit?: boolean; allowInFunctions?: boolean; ignoreIdentifierPattern?: string | Array<string> }?,
];

/** Inside the body of any enclosing function (not just the nearest), like upstream's `isInFunctionBody`. */
function isInsideAnyFunctionBody(node: ESTree.Node): boolean {
  for (let fn = getEnclosingFunction(node); fn != null; fn = getEnclosingFunction(fn)) {
    if (isInFunctionBody(node, fn)) return true;
  }
  return false;
}

/**
 * Upstream (eslint-plugin-functional 10.0.1) matches the pattern against each declarator's name and
 * ignores the declaration only if every named declarator matches; destructured declarators have no
 * name and don't count. No named declarator at all: not ignored.
 */
function isIgnoredByPattern(node: ESTree.VariableDeclaration, pattern: string | Array<string> | undefined): boolean {
  if (pattern === undefined) return false;
  const names = node.declarations.flatMap((d) => (d.id.type === "Identifier" ? [d.id.name] : []));
  return names.length > 0 && names.every((name) => shouldIgnorePattern(name, pattern));
}

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Disallow mutable variables declared with let.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInForLoopInit: { type: "boolean" },
          allowInFunctions: { type: "boolean" },
          ignoreIdentifierPattern: {
            anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      generic: "Unexpected let, use const instead.",
    },
    defaultOptions: [{ allowInForLoopInit: false, allowInFunctions: false }],
  },
  createOnce(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== "let") {
          return;
        }
        const options = ruleOptions<NonNullable<RuleOptions[0]>>(context);
        if (options?.allowInFunctions === true && isInsideAnyFunctionBody(node)) {
          return;
        }
        if (isIgnoredByPattern(node, options?.ignoreIdentifierPattern)) {
          return;
        }
        if (options?.allowInForLoopInit === true && isInForLoopInitializer(node)) {
          return;
        }
        context.report({ node, messageId: "generic" });
      },
    };
  },
});
