import type { Context, ESTree } from "@oxlint/plugins";

type Child = ESTree.Node | null | undefined;

export function trace(node: Child, context: Context): Child {
  let current: Child = node;
  const visited = new Set<ESTree.Node>();

  while (current?.type === "Identifier" && !visited.has(current)) {
    visited.add(current);

    const sourceCode = context.sourceCode;
    const scope = sourceCode.getScope(current);

    const variable = scope?.set?.get?.(current.name);
    const definition = variable?.defs?.[0];
    const declNode = definition?.node;

    if (declNode?.type === "VariableDeclarator" && declNode.id?.type === "Identifier" && declNode.init) {
      const declarationKind = declNode.parent.type === "VariableDeclaration" ? declNode.parent.kind : undefined;
      const isStableConst = declarationKind === "const";
      const isReadonlyRef = variable?.references?.every?.((ref) => ref.init || ref.isReadOnly?.());

      if (isStableConst || isReadonlyRef) {
        current = declNode.init;
        continue;
      }
    }

    break;
  }

  return current;
}
