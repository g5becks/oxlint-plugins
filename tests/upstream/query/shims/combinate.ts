// `combinate` is CommonJS (`exports.default = fn`); the vendored suites import it as a default.
import { createRequire } from "node:module";

const mod = createRequire(import.meta.url)("combinate");
export default (mod.default ?? mod) as <T extends Record<string, readonly unknown[]>>(
  values: T,
) => Array<{ [K in keyof T]: T[K][number] }>;
