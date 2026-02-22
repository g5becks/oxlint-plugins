import { createFileRoute, createRoute } from "@tanstack/react-router";

// Invalid param name (starts with number)
createFileRoute("/users/$123bad")({
  component: () => null,
});

// Invalid property order: loader before loaderDeps
createRoute({
  loader: () => null,
  loaderDeps: ({ search }: any) => ({ search }),
  search: (params: any) => params,
});
