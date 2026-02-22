import { shouldIgnorePattern } from "../utils/ignore";
import { hasReadonlyModifier, isReadonlyArrayType } from "../utils/immutability";

type RuleOptions = [
  {
    identifiers?: string | Array<string>;
    ignoreInterfaces?: boolean;
  }?,
];

function membersAreReadonly(members: Array<any>): boolean {
  return members.every((member) => {
    if (member.type === "TSPropertySignature") {
      if (!hasReadonlyModifier(member)) {
        return false;
      }
      const typeNode = member.typeAnnotation?.typeAnnotation;
      // A plain array type (e.g. `string[]`) is not shallowly immutable even with `readonly`.
      if (typeNode?.type === "TSArrayType") {
        return false;
      }
      // `readonly T[]` syntax or `ReadonlyArray<T>` → immutable.
      if (typeNode?.type === "TSTypeOperator" && typeNode.operator === "readonly") {
        return true;
      }
      if (typeNode && isReadonlyArrayType(typeNode)) {
        return true;
      }
      // NOTE: For TSTypeReference targets (e.g. `type Foo = OtherType`) we cannot resolve
      // the alias without a type checker, so we conservatively accept them as-is when the
      // `readonly` modifier is present.
      return true;
    }

    if (member.type === "TSIndexSignature") {
      return hasReadonlyModifier(member);
    }

    // Other member kinds (TSMethodSignature, TSCallSignatureDeclaration, etc.) are
    // considered readonly by default since they define behaviour, not mutable state.
    return true;
  });
}

function shouldCheckName(name: string | undefined, identifiers?: string | Array<string>): boolean {
  if (!identifiers) {
    return true;
  }
  return !shouldIgnorePattern(name, identifiers);
}

export default {
  meta: {
    type: "suggestion",
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
  },
  defaultOptions: [{ ignoreInterfaces: false }] as RuleOptions,
  createOnce(context: any) {
    const getOpts = () => (context.options?.[0] ?? {}) as RuleOptions[0];

    return {
      TSTypeAliasDeclaration(node: any) {
        const option = getOpts();
        const name = node.id?.name;
        if (!shouldCheckName(name, option?.identifiers)) {
          return;
        }

        const typeAnnotation = node.typeAnnotation;

        if (typeAnnotation?.type === "TSTypeLiteral") {
          if (!membersAreReadonly(typeAnnotation.members ?? [])) {
            context.report({ node, messageId: "notReadonly" });
          }
          return;
        }

        if (typeAnnotation?.type === "TSIntersectionType") {
          const literalConstituents = (typeAnnotation.types ?? []).filter(
            (t: any) => t.type === "TSTypeLiteral"
          );
          // No literal constituents means all parts are type references —
          // we can't assess immutability without the type checker, so skip.
          if (literalConstituents.length === 0) {
            return;
          }
          for (const literal of literalConstituents) {
            if (!membersAreReadonly(literal.members ?? [])) {
              context.report({ node, messageId: "notReadonly" });
              return;
            }
          }
        }
      },
      TSInterfaceDeclaration(node: any) {
        const option = getOpts();
        if (option?.ignoreInterfaces === true) {
          return;
        }

        const name = node.id?.name;
        if (!shouldCheckName(name, option?.identifiers)) {
          return;
        }

        if (!membersAreReadonly(node.body?.body ?? [])) {
          context.report({ node, messageId: "notReadonly" });
        }
      },
    };
  },
};
