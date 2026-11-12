// eslint-plugin-solid's own test setup (vitest.setup.js at v0.14.5) mocks `trackImports` so that
// `matchImport` matches by name without requiring a solid-js import in each test case:
//
//   vi.mock("./src/utils", ... trackImports: () => ({ matchImport: (imports, str) =>
//     [imports].flat().find((i) => i === str), handleImportDeclaration: () => {} }))
//
// The upstream-suite hooks replace the port's utils/imports.ts with this identical mock, so the
// vendored cases run under the same conditions as upstream's. Normal runs never load this file.
export function trackImports(_fromModule?: RegExp) {
  return {
    handleImportDeclaration(_node: unknown) {},
    matchImport(imports: string | Array<string>, localName: string): string | undefined {
      const candidates = Array.isArray(imports) ? imports : [imports];
      return candidates.find((importName) => importName === localName);
    },
    clear() {},
  };
}
