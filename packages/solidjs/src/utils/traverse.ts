export function find(node: any, predicate: (node: any) => boolean): any | null {
  let current = node;

  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

export function findParent(node: any, predicate: (node: any) => boolean): any | null {
  return node?.parent ? find(node.parent, predicate) : null;
}
