import type { ESTree } from "@oxlint/plugins";

type MaybeNode = { type?: unknown } | null | undefined;

/**
 * Pre-order walk of every node below `root` (estraverse's fallback order: fields in key order,
 * array elements in index order; any object with a string `type` is a node; `parent` is skipped).
 * `skip()` in `enter` prunes that node's subtree. Iterative with an explicit stack, so the depth
 * of the tree is not limited by the call stack (audit P2).
 */
export function walkTree(root: ESTree.Node, enter: (n: ESTree.Node, skip: () => void) => void): void {
  const stack: Array<ESTree.Node> = [root];
  let skipped = false;
  const skip = () => {
    skipped = true;
  };
  const children: Array<ESTree.Node> = [];

  while (stack.length > 0) {
    const node = stack.pop() as ESTree.Node;
    skipped = false;
    enter(node, skip);
    if (skipped) continue;

    children.length = 0;
    const fields = node as unknown as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      if (key === "parent") continue;
      const child = fields[key] as MaybeNode | Array<MaybeNode>;
      if (child && typeof child === "object") {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item.type === "string") children.push(item as ESTree.Node);
          }
        } else if (typeof child.type === "string") {
          children.push(child as ESTree.Node);
        }
      }
    }
    // Push in reverse so the first child is visited next.
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i] as ESTree.Node);
  }
}

/** Array methods whose callback runs in place, as part of the enclosing function's body. */
const SYNC_METHODS = /^(?:forEach|map|flatMap|reduce|reduceRight|find|findIndex|filter|every|some)$/;

/**
 * Visit a function's own body: everything that runs when it runs, including callbacks that run in
 * place (array iteration methods, IIFEs), but not nested functions that run later (TASK-046/056).
 */
export function walkOwnBody(fn: { body?: ESTree.Node | null }, visit: (node: ESTree.Node) => void): void {
  if (!fn.body) return;
  walkTree(fn.body, (node, skip) => {
    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
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
}
