export function trackImports(fromModule: RegExp = /^solid-js(?:\/?|\b)/) {
  const importMap = new Map<string, string>();

  return {
    handleImportDeclaration(node: any) {
      if (node?.type !== "ImportDeclaration" || typeof node.source?.value !== "string") {
        return;
      }

      if (!fromModule.test(node.source.value)) {
        return;
      }

      for (const specifier of node.specifiers ?? []) {
        if (
          specifier?.type === "ImportSpecifier" &&
          specifier.imported?.type === "Identifier" &&
          specifier.local?.type === "Identifier"
        ) {
          importMap.set(specifier.imported.name, specifier.local.name);
        }
      }
    },

    matchImport(imports: string | Array<string>, localName: string): string | undefined {
      const candidates = Array.isArray(imports) ? imports : [imports];
      return candidates.find((importName) => importMap.get(importName) === localName);
    },

    clear() {
      importMap.clear();
    },
  };
}
