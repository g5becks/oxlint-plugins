import type { Comment, ESTree, Fix, Fixer, SourceCode } from "@oxlint/plugins";

/**
 * Add named imports to an existing import declaration (ported from eslint-plugin-solid 0.14.5
 * `appendImports`). Handles `import { B }`, `import A`, `import * as A`, `import {} from` and
 * side-effect `import "source"` forms.
 */
export function appendImports(
  fixer: Fixer,
  sourceCode: SourceCode,
  importNode: ESTree.ImportDeclaration,
  identifiers: Array<string>,
): Fix | null {
  const identifiersString = identifiers.join(", ");
  const reversedSpecifiers = importNode.specifiers.slice().reverse();
  const lastSpecifier = reversedSpecifiers.find((s) => s.type === "ImportSpecifier");
  if (lastSpecifier) {
    return fixer.insertTextAfter(lastSpecifier, `, ${identifiersString}`);
  }
  const otherSpecifier = importNode.specifiers.find(
    (s) => s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier",
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

function getCommentBefore(node: ESTree.Node, sourceCode: SourceCode): Comment | undefined {
  return sourceCode.getCommentsBefore(node).find((comment) => comment.loc.end.line >= node.loc.start.line - 1);
}

/** Insert `import { a, b } from "<source>";` before the first import (ported from eslint-plugin-solid). */
export function insertImports(fixer: Fixer, sourceCode: SourceCode, source: string, identifiers: Array<string>): Fix {
  const identifiersString = identifiers.join(", ");
  const programNode = sourceCode.ast;
  const firstImport = programNode.body.find((n) => n.type === "ImportDeclaration");
  if (firstImport) {
    return fixer.insertTextBeforeRange(
      (getCommentBefore(firstImport, sourceCode) ?? firstImport).range,
      `import { ${identifiersString} } from "${source}";\n`,
    );
  }
  return fixer.insertTextBeforeRange([0, 0], `import { ${identifiersString} } from "${source}";\n`);
}

/** Local names bound at module level (imports and top-level declarations). */
function moduleBindings(sourceCode: SourceCode): Set<string> {
  const names = new Set<string>();
  for (const node of sourceCode.ast.body ?? []) {
    if (node.type === "ImportDeclaration") {
      for (const s of node.specifiers ?? []) if (s.local.name) names.add(s.local.name);
      continue;
    }
    const decl: ESTree.Node | null = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (!decl) continue;
    // Function, class, enum and other declarations with an identifier `id`.
    const id = "id" in decl ? decl.id : null;
    if (id && "name" in id && typeof id.name === "string" && id.name) names.add(id.name);
    if (decl.type === "VariableDeclaration") {
      for (const d of decl.declarations) if (d.id.type === "Identifier") names.add(d.id.name);
    }
  }
  return names;
}

/**
 * Fix(es) that make the Solid components a fix introduces (`Show`, `Switch`, `Match`) available:
 * nothing when they are already bound at module level, otherwise an added `solid-js` import.
 * Keeps `oxlint --fix` output valid (TASK-026 fix safety).
 */
export function ensureSolidImports(fixer: Fixer, sourceCode: SourceCode, names: Array<string>): Array<Fix> {
  const bound = moduleBindings(sourceCode);
  const missing = names.filter((n) => !bound.has(n));
  if (missing.length === 0) return [];
  const solidImport = (sourceCode.ast.body ?? []).find(
    (n): n is ESTree.ImportDeclaration =>
      n.type === "ImportDeclaration" && n.source.value === "solid-js" && n.importKind !== "type",
  );
  const fix = solidImport
    ? appendImports(fixer, sourceCode, solidImport, missing)
    : insertImports(fixer, sourceCode, "solid-js", missing);
  return fix ? [fix] : [];
}

/**
 * Remove one specifier from an import declaration, with its comma; the whole declaration when it is
 * the only specifier. Returns null when the expected comma token is missing.
 */
export function removeImportSpecifier(
  fixer: Fixer,
  sourceCode: SourceCode,
  specifier: ESTree.ImportDeclarationSpecifier,
  declaration: ESTree.ImportDeclaration,
): Fix | null {
  const specifiers: ReadonlyArray<ESTree.ImportDeclarationSpecifier> = declaration.specifiers ?? [];
  if (specifiers.length === 1) return fixer.remove(declaration);
  const index = specifiers.indexOf(specifier);
  if (index === specifiers.length - 1) {
    const tokenBefore = sourceCode.getTokenBefore(specifier);
    return tokenBefore ? fixer.removeRange([tokenBefore.range[0], specifier.range[1]]) : null;
  }
  const comma = sourceCode.getTokenAfter(specifier);
  const next = comma && sourceCode.getTokenAfter(comma);
  // Up to the next specifier, so `{ A, B }` without A is `{ B }`.
  return comma && next ? fixer.removeRange([specifier.range[0], next.range[0]]) : null;
}
