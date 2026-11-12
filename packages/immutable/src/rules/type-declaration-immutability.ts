import { defineRule, type ESTree } from "@oxlint/plugins";
import { shouldIgnorePattern } from "../utils/ignore.ts";
import { hasReadonlyModifier } from "../utils/immutability.ts";
import { ruleOptions } from "../utils/options.ts";

type RuleOptions = [
  {
    identifiers?: string | Array<string>;
    ignoreInterfaces?: boolean;
  }?,
];

/**
 * Syntactic ReadonlyShallow check (no type information): is the declared type mutable at the
 * top level? Returns "unknown" for named types that can't be resolved without a type checker;
 * those are not reported.
 */
type Verdict = "mutable" | "readonly" | "unknown";

/** Mutable collection types (and `Record`, an object type with mutable properties). */
const MUTABLE_REFERENCES = new Set(["Array", "Map", "Set", "WeakMap", "WeakSet", "Record"]);
/** Readonly wrappers and collections. */
const READONLY_REFERENCES = new Set(["Readonly", "ReadonlyArray", "ReadonlyMap", "ReadonlySet"]);
/** Utility types whose result keeps the readonly-ness of their first type argument. */
const PRESERVING_REFERENCES = new Set(["Partial", "Required", "Pick", "Omit", "NonNullable"]);

function membersVerdict(members: ReadonlyArray<ESTree.TSSignature>): Verdict {
  for (const member of members) {
    // ReadonlyShallow: the property itself must be readonly; its type may be mutable
    // (`readonly items: string[]` is accepted, as upstream does).
    if (member.type === "TSPropertySignature" || member.type === "TSIndexSignature") {
      if (!hasReadonlyModifier(member)) return "mutable";
    }
    // Methods, call and construct signatures define behaviour, not mutable state.
  }
  return "readonly";
}

function typeArgs(node: ESTree.TSTypeReference): ReadonlyArray<ESTree.TSType> {
  // `typeParameters`: the older ESTree name for the same node, read as before.
  const legacy = (node as { typeParameters?: ESTree.TSTypeParameterInstantiation | null }).typeParameters;
  return (node.typeArguments ?? legacy)?.params ?? [];
}

function verdictOf(node: ESTree.TSType | null | undefined, depth = 0): Verdict {
  if (!node || depth > 20) return "unknown";
  switch (node.type) {
    case "TSParenthesizedType":
      return verdictOf(node.typeAnnotation, depth + 1);
    case "TSTypeLiteral":
      return membersVerdict(node.members ?? []);
    case "TSArrayType":
    case "TSTupleType":
      return "mutable";
    case "TSTypeOperator":
      // `readonly T[]` / `readonly [A, B]`
      return node.operator === "readonly" ? "readonly" : "unknown";
    case "TSMappedType":
      // `{ [K in X]: T }` is mutable; `{ readonly [K in X]: T }` (or `+readonly`) is not.
      return node.readonly === true || node.readonly === "+" ? "readonly" : "mutable";
    case "TSUnionType":
    case "TSIntersectionType": {
      const verdicts = node.types.map((t) => verdictOf(t, depth + 1));
      if (verdicts.includes("mutable")) return "mutable";
      return verdicts.includes("unknown") ? "unknown" : "readonly";
    }
    case "TSTypeReference": {
      const name = node.typeName.type === "Identifier" ? node.typeName.name : undefined;
      if (!name) return "unknown";
      if (MUTABLE_REFERENCES.has(name)) return "mutable";
      if (READONLY_REFERENCES.has(name)) return "readonly";
      if (PRESERVING_REFERENCES.has(name)) return verdictOf(typeArgs(node)[0], depth + 1);
      return "unknown";
    }
    default:
      // Primitives, literal types, function types, `typeof`, keyof, etc.
      return node.type?.startsWith("TS") && node.type.endsWith("Keyword") ? "readonly" : "unknown";
  }
}

function shouldCheckName(name: string | undefined, identifiers?: string | Array<string>): boolean {
  if (!identifiers) {
    return true;
  }
  return !shouldIgnorePattern(name, identifiers);
}

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Enforce ReadonlyShallow immutability on type declarations.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          identifiers: {
            anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          },
          ignoreInterfaces: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      notReadonly: "Type declaration should be at least ReadonlyShallow.",
    },
    defaultOptions: [{ ignoreInterfaces: false }],
  },
  createOnce(context) {
    const getOpts = () => ruleOptions<NonNullable<RuleOptions[0]>>(context) ?? {};

    return {
      TSTypeAliasDeclaration(node) {
        const option = getOpts();
        const name = node.id?.name;
        if (!shouldCheckName(name, option?.identifiers)) {
          return;
        }

        if (verdictOf(node.typeAnnotation) === "mutable") {
          context.report({ node, messageId: "notReadonly" });
        }
      },
      TSInterfaceDeclaration(node) {
        const option = getOpts();
        if (option?.ignoreInterfaces === true) {
          return;
        }

        const name = node.id?.name;
        if (!shouldCheckName(name, option?.identifiers)) {
          return;
        }

        if (membersVerdict(node.body?.body ?? []) === "mutable") {
          context.report({ node, messageId: "notReadonly" });
        }
      },
    };
  },
});
