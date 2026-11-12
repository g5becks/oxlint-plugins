// Resolve/load hooks for the vendored eslint-plugin-solid suites:
//   ../ruleTester          -> rule-tester-shim.ts (`run(name, rule, tests)` with OUR port of `name`)
//   ../../src/rules/<rule> -> a stub default export naming the rule (the shim ignores it)
//   vitest                 -> the node:test shim shared with the query suites
//   packages/solidjs/src/utils/imports.ts -> track-imports-mock.ts (as upstream's vitest.setup.js)
//   extensionless relative imports -> `.ts`
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (file) => new URL(file, import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === "vitest") return { url: here("../query/shims/vitest.ts"), shortCircuit: true };
  // Like upstream's vitest.setup.js: mock trackImports (match by name, no import needed).
  if ((context.parentURL ?? "").includes("/packages/solidjs/src/") && specifier.endsWith("/utils/imports.ts")) {
    return { url: here("track-imports-mock.ts"), shortCircuit: true };
  }
  const parent = context.parentURL ?? "";
  if (parent.includes("/vendor/eslint-plugin-solid@") && specifier.startsWith(".")) {
    if (specifier.endsWith("/ruleTester")) return { url: here("rule-tester-shim.ts"), shortCircuit: true };
    const rule = /\/src\/rules\/([^/]+)$/.exec(specifier);
    if (rule) return { url: `solid-rule-stub:${rule[1]}`, shortCircuit: true };
    if (!/\.[cm]?[jt]s$/.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, parent);
      if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith("solid-rule-stub:")) {
    const name = url.slice("solid-rule-stub:".length);
    return {
      format: "module",
      shortCircuit: true,
      source: `export default { upstreamRule: ${JSON.stringify(name)} };\n`,
    };
  }
  return next(url, context);
}
