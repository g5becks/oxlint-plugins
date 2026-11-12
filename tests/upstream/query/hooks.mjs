// Resolve hook: redirect the vendored suites' imports.
//   @typescript-eslint/rule-tester -> shims/rule-tester.ts (oxlint RuleTester + our port)
//   vitest                         -> shims/vitest.ts (node:test)
//   ../rules/<rule>/<rule>.rule    -> a module re-exporting the upstream rule module (its
//                                     constants) with `rule` replaced by a marker; the
//                                     RuleTester shim runs our port of `name` instead
//   ../utils/sort-data-by-order    -> our port's util (packages/query/src/utils)
//   extensionless relative imports -> `.ts`
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const shim = (file) => new URL(`./shims/${file}`, import.meta.url).href;
const PORT_UTIL = new URL("../../../packages/query/src/utils/sort-data-by-order.ts", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === "@typescript-eslint/rule-tester") return { url: shim("rule-tester.ts"), shortCircuit: true };
  if (specifier === "vitest") return { url: shim("vitest.ts"), shortCircuit: true };
  if (specifier === "combinate") return { url: shim("combinate.ts"), shortCircuit: true };
  const parent = context.parentURL ?? "";
  if (parent.includes("/vendor/") && specifier.startsWith(".")) {
    const rule = /\/rules\/([^/]+)\/\1\.rule$/.exec(specifier);
    if (rule) {
      const upstream = new URL(`${specifier}.ts`, parent).href;
      return { url: `upstream-rule:${rule[1]}?${encodeURIComponent(upstream)}`, shortCircuit: true };
    }
    if (specifier.endsWith("/utils/sort-data-by-order")) return { url: PORT_UTIL, shortCircuit: true };
    if (!/\.[cm]?[jt]s$/.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, parent);
      if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith("upstream-rule:")) {
    const upstream = decodeURIComponent(url.slice(url.indexOf("?") + 1));
    const name = url.slice("upstream-rule:".length, url.indexOf("?"));
    return {
      format: "module",
      shortCircuit: true,
      source: `export * from ${JSON.stringify(upstream)};\nexport const rule = { upstreamRule: ${JSON.stringify(name)} };\n`,
    };
  }
  return next(url, context);
}

export { pathToFileURL };
