// Node module hooks for running eslint-plugin-solid 0.14.5's test suites unmodified
// (vendor/eslint-plugin-solid@0.14.5/test) against our ports.
// Usage: node --import ./tests/upstream/solid/register.mjs --test <vendored test files>
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
