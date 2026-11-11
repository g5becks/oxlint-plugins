/**
 * Add named imports to an existing import declaration (ported from eslint-plugin-solid 0.14.5
 * `appendImports`). Handles `import { B }`, `import A`, `import * as A`, `import {} from` and
 * side-effect `import "source"` forms.
 */
export function appendImports(fixer: any, sourceCode: any, importNode: any, identifiers: Array<string>): any {
  const identifiersString = identifiers.join(", ");
  const reversedSpecifiers = importNode.specifiers.slice().reverse();
  const lastSpecifier = reversedSpecifiers.find((s: any) => s.type === "ImportSpecifier");
  if (lastSpecifier) {
    return fixer.insertTextAfter(lastSpecifier, `, ${identifiersString}`);
  }
  const otherSpecifier = importNode.specifiers.find(
    (s: any) => s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier",
  );
  if (otherSpecifier) {
    return fixer.insertTextAfter(otherSpecifier, `, { ${identifiersString} }`);
  }
  if (importNode.specifiers.length === 0) {
    const [importToken, maybeBrace] = sourceCode.getFirstTokens(importNode, { count: 2 });
    if (maybeBrace?.value === "{") {
      return fixer.insertTextAfter(maybeBrace, ` ${identifiersString} `);
    } else {
      return importToken ? fixer.insertTextAfter(importToken, ` { ${identifiersString} } from`) : null;
    }
  }
  return null;
}
