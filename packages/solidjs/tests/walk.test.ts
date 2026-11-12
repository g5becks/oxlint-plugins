import assert from "node:assert/strict";
import { test } from "node:test";
import type { ESTree } from "@oxlint/plugins";
import { walkTree } from "../src/utils/walk.ts";

// Audit P2 / TASK-030: walkTree must not use the call stack per tree level. Real parsers stop
// before JSX gets this deep (oxlint 1.93's deserializer overflows from ~1,900 nested elements),
// but a walker shouldn't be the limit: a 100,000-level synthetic tree must walk without a RangeError.
function deepTree(depth: number): ESTree.Node {
  let node: Record<string, unknown> = { type: "Identifier", name: "x" };
  for (let i = 0; i < depth; i++) {
    node = { type: "UnaryExpression", operator: "!", prefix: true, argument: node };
  }
  return node as unknown as ESTree.Node;
}

test("walks a 100,000-level tree without overflowing the stack", () => {
  let visited = 0;
  walkTree(deepTree(100_000), () => {
    visited++;
  });
  assert.equal(visited, 100_001);
});

test("visits in pre-order (fields in key order, arrays in index order) and skip() prunes a subtree", () => {
  const tree = {
    type: "Program",
    body: [
      { type: "ExpressionStatement", expression: { type: "Identifier", name: "a" } },
      {
        type: "BlockStatement",
        body: [{ type: "ExpressionStatement", expression: { type: "Identifier", name: "b" } }],
      },
      { type: "ExpressionStatement", expression: { type: "Identifier", name: "c" } },
    ],
  } as unknown as ESTree.Node;
  const order: string[] = [];
  walkTree(tree, (n, skip) => {
    order.push(n.type === "Identifier" ? n.name : n.type);
    if (n.type === "BlockStatement") skip();
  });
  assert.deepEqual(order, ["Program", "ExpressionStatement", "a", "BlockStatement", "ExpressionStatement", "c"]);
});

test("ignores the parent pointer and non-node values", () => {
  const child: Record<string, unknown> = { type: "Identifier", name: "a" };
  const root: Record<string, unknown> = {
    type: "ExpressionStatement",
    expression: child,
    extra: { notANode: 1 },
    list: [null, 3],
  };
  child.parent = root;
  const seen: string[] = [];
  walkTree(root as unknown as ESTree.Node, (n) => {
    seen.push(n.type);
  });
  assert.deepEqual(seen, ["ExpressionStatement", "Identifier"]);
});
