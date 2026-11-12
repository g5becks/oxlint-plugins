import type { ESTree } from "@oxlint/plugins";

type Child = ESTree.Node | null | undefined;

export function find(node: Child, predicate: (node: ESTree.Node) => boolean): ESTree.Node | null {
  let current: Child = node;

  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

export function findParent(node: Child, predicate: (node: ESTree.Node) => boolean): ESTree.Node | null {
  return node?.parent ? find(node.parent, predicate) : null;
}
