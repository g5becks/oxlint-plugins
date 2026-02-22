import { createRoute, createFileRoute } from "@tanstack/react-router";

// ── VALID ──────────────────────────────────────────────
createRoute({
  path: "/valid",
  validateSearch: (params: any) => params,
  loaderDeps: ({ search }: any) => ({ search }),
  loader: () => null,
  component: () => null,
});

// ── INVALID ────────────────────────────────────────────

// 1) loader before loaderDeps
createRoute({
  path: "/bad-order",
  loader: () => null,
  loaderDeps: ({ search }: any) => ({ search }),
  component: () => null,
});

// 2) loader before validateSearch
createRoute({
  loader: () => null,
  validateSearch: (params: any) => params,
  component: () => null,
});
