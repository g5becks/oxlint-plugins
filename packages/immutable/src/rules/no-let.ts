import { shouldIgnorePattern } from "../utils/ignore.ts";
import { getEnclosingFunction, isInForLoopInitializer, isInFunctionBody } from "../utils/tree.ts";

type RuleOptions = [
  { allowInForLoopInit?: boolean; allowInFunctions?: boolean; ignoreIdentifierPattern?: string | Array<string> }?,
];

/** Inside the body of any enclosing function (not just the nearest), like upstream's `isInFunctionBody`. */
function isInsideAnyFunctionBody(node: any): boolean {
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
function isIgnoredByPattern(node: any, pattern: string | Array<string> | undefined): boolean {
  if (pattern === undefined) return false;
  const names = node.declarations.filter((d: any) => d.id?.type === "Identifier").map((d: any) => d.id.name as string);
  return names.length > 0 && names.every((name: string) => shouldIgnorePattern(name, pattern));
}

export default {
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
  },
  defaultOptions: [{ allowInForLoopInit: false, allowInFunctions: false }] as RuleOptions,
  createOnce(context: any) {
    return {
      VariableDeclaration(node: any) {
        if (node.kind !== "let") {
          return;
        }
        const options = context.options?.[0];
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
};
