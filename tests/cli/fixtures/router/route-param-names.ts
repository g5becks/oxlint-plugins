import { createFileRoute, createRoute } from "@tanstack/react-router";

// ── VALID ──────────────────────────────────────────────
createFileRoute("/users/$userId")({
  component: () => null,
});

createRoute({
  path: "/posts/$postId",
  component: () => null,
});

createFileRoute("/items/$item_name")({
  component: () => null,
});

// ── INVALID ────────────────────────────────────────────

// 1) starts with a number
createFileRoute("/users/$123bad")({
  component: () => null,
});

// 2) contains a hyphen
createFileRoute("/posts/$post-id")({
  component: () => null,
});

// 3) starts with a number (createRoute with path property)
createRoute({
  path: "/items/$0index",
  component: () => null,
});
