import { createFileRoute, createRoute } from "@tanstack/react-router";

// Valid param names
createFileRoute("/users/$userId")({
  component: () => null,
});

createFileRoute("/posts/$postId/comments/$commentId")({
  component: () => null,
});

// Valid property order: search before loaderDeps, loaderDeps before loader
createRoute({
  search: (params: any) => params,
  loaderDeps: ({ search }: any) => ({ search }),
  loader: () => null,
});
