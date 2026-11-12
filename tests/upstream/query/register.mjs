// Node module hooks for running the vendored TanStack Query test suites unmodified
// (vendor/@tanstack/eslint-plugin-query@5.91.4/src/__tests__) against our ports.
// Usage: node --import ./tests/upstream/query/register.mjs --test <vendored test files>
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
