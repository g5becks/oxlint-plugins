import { defineRule, type ESTree, type Fix, type Fixer, type SourceCode } from "@oxlint/plugins";
import { appendImports, removeImportSpecifier } from "../utils/fix-imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { MODULES_V2, PATHS_V2, TYPE_MODULES_V2 } from "../utils/solid2.ts";
type Source = "solid-js" | "solid-js/web" | "solid-js/store";

const primitiveMap = new Map<string, Source>();
for (const p of [
  "createSignal",
  "createEffect",
  "createMemo",
  "createResource",
  "onMount",
  "onCleanup",
  "onError",
  "untrack",
  "batch",
  "on",
  "createRoot",
  "getOwner",
  "runWithOwner",
  "mergeProps",
  "splitProps",
  "useTransition",
  "observable",
  "from",
  "mapArray",
  "indexArray",
  "createContext",
  "useContext",
  "children",
  "lazy",
  "createUniqueId",
  "createDeferred",
  "createRenderEffect",
  "createComputed",
  "createReaction",
  "createSelector",
  "DEV",
  "For",
  "Show",
  "Switch",
  "Match",
  "Index",
  "ErrorBoundary",
  "Suspense",
  "SuspenseList",
])
  primitiveMap.set(p, "solid-js");

for (const p of [
  "Portal",
  "render",
  "hydrate",
  "renderToString",
  "renderToStream",
  "isServer",
  "renderToStringAsync",
  "generateHydrationScript",
  "HydrationScript",
  "Dynamic",
])
  primitiveMap.set(p, "solid-js/web");

for (const p of ["createStore", "produce", "reconcile", "unwrap", "createMutable", "modifyMutable"])
  primitiveMap.set(p, "solid-js/store");

const typeMap = new Map<string, Source>();
for (const t of [
  "Signal",
  "Accessor",
  "Setter",
  "Resource",
  "ResourceActions",
  "ResourceOptions",
  "ResourceReturn",
  "ResourceFetcher",
  "InitializedResourceReturn",
  "Component",
  "VoidProps",
  "VoidComponent",
  "ParentProps",
  "ParentComponent",
  "FlowProps",
  "FlowComponent",
  "ValidComponent",
  "ComponentProps",
  "Ref",
  "MergeProps",
  "SplitPrips",
  "Context",
  "JSX",
  "ResolvedChildren",
  "MatchProps",
])
  typeMap.set(t, "solid-js");
for (const t of ["MountableElement"]) typeMap.set(t, "solid-js/web");
for (const t of ["StoreNode", "Store", "SetStoreFunction"]) typeMap.set(t, "solid-js/store");

const sourceRegex = /^solid-js(?:\/web|\/store)?$/;
const isSource = (source: string): source is Source => sourceRegex.test(source);

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: 'Enforce consistent imports from "solid-js", "solid-js/web", and "solid-js/store".',
      recommended: "error",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/imports.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      "prefer-source": 'Prefer importing {{name}} from "{{source}}".',
      movedModule: '"{{from}}" is "{{to}}" in Solid 2.0.',
      removedType:
        '`{{name}}` was removed from solid-js in Solid 2.0. Use `Element` from "solid-js" for renderer-neutral values, or `JSX.Element` from "@solidjs/web".',
    },
  },
  createOnce(context) {
    let v2 = false;
    /**
     * Version 2: the file's fixable reports. All import fixes sit in the import block and overlap,
     * so they share one combined fix (as no-removed-apis does): one oxlint --fix run applies them;
     * an edit that would overlap ones already taken waits for the next run.
     */
    let pending: Array<{
      node: ESTree.Node;
      messageId: "prefer-source" | "movedModule";
      data: Record<string, string>;
      build: (fixer: Fixer) => Fix | Fix[] | null;
    }> = [];

    const combinedFix = (fixer: Fixer): Fix[] => {
      const accepted: Fix[] = [];
      for (const { build } of pending) {
        const built = build(fixer);
        if (!built) continue;
        const fixes = Array.isArray(built) ? built : [built];
        const overlaps = fixes.some((f) => accepted.some((a) => f.range[0] < a.range[1] && a.range[0] < f.range[1]));
        if (!overlaps) accepted.push(...fixes);
      }
      return accepted;
    };

    // ---- Version 2 (TASK-048): the 2.0 module map and the import-path migration ----

    const declarations = () =>
      context.sourceCode.ast.body.filter((n): n is ESTree.ImportDeclaration => n.type === "ImportDeclaration");

    /** Remove a whole declaration and its line break. */
    const removeDeclaration = (fixer: Fixer, node: ESTree.ImportDeclaration): Fix => {
      const end = context.sourceCode.text[node.range[1]] === "\n" ? node.range[1] + 1 : node.range[1];
      return fixer.removeRange([node.range[0], end]);
    };

    const quoted = (node: ESTree.ImportDeclaration, path: string): string => {
      const quote = context.sourceCode.getText(node.source).charAt(0) === "'" ? "'" : '"';
      return `${quote}${path}${quote}`;
    };

    /** Move one specifier to `target`: rewrite a lone specifier's source, else merge or split it out. */
    const moveSpecifierV2 = (
      fixer: Fixer,
      specifier: ESTree.ImportSpecifier,
      node: ESTree.ImportDeclaration,
      target: string,
    ): Fix[] | null => {
      const sourceCode = context.sourceCode;
      const kind = node.importKind === "type" ? "type" : "value";
      const existing = declarations().find(
        (d) =>
          d !== node &&
          d.source.value === target &&
          (d.importKind === "type" ? "type" : "value") === kind &&
          !d.specifiers.some((s) => s.type === "ImportNamespaceSpecifier"),
      );
      const text = sourceCode.getText(specifier);
      const only = node.specifiers.length === 1;
      if (existing) {
        const append = appendImports(fixer, sourceCode, existing, [text]);
        const remove = only
          ? removeDeclaration(fixer, node)
          : removeImportSpecifier(fixer, sourceCode, specifier, node);
        return append && remove ? [append, remove] : null;
      }
      if (only) return [fixer.replaceText(node.source, quoted(node, target))];
      const remove = removeImportSpecifier(fixer, sourceCode, specifier, node);
      if (!remove) return null;
      const keyword = kind === "type" ? "type " : "";
      return [remove, fixer.insertTextBefore(node, `import ${keyword}{ ${text} } from ${quoted(node, target)};\n`)];
    };

    const checkV2 = (node: ESTree.ImportDeclaration) => {
      const source = node.source?.value;
      if (typeof source !== "string") return;

      // MIGRATION §Quick rename / removal map (Import paths); RFC 09 §Migration / replacement.
      const path = PATHS_V2.get(source);
      if (path) {
        pending.push({
          node: node.source,
          messageId: "movedModule",
          data: { from: source, to: path.to },
          build(fixer) {
            // Store APIs merge into an existing value import from solid-js.
            const target =
              node.importKind !== "type" &&
              node.specifiers.length > 0 &&
              node.specifiers.every((s) => s.type === "ImportSpecifier")
                ? declarations().find(
                    (d) =>
                      d !== node &&
                      d.source.value === path.to &&
                      d.importKind !== "type" &&
                      !d.specifiers.some((s) => s.type === "ImportNamespaceSpecifier"),
                  )
                : undefined;
            if (target) {
              const texts = node.specifiers.map((s) => context.sourceCode.getText(s));
              const append = appendImports(fixer, context.sourceCode, target, texts);
              return append ? [append, removeDeclaration(fixer, node)] : null;
            }
            return fixer.replaceText(node.source, quoted(node, path.to));
          },
        });
        return; // The specifiers are checked once the path is fixed.
      }

      if (source !== "solid-js" && source !== "@solidjs/web") return;
      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier" || specifier.imported.type !== "Identifier") continue;
        const name = specifier.imported.name;
        const isType = specifier.importKind === "type" || node.importKind === "type";
        if (isType && name === "JSXElement" && source === "solid-js") {
          // RFC 09 §Removals.
          context.report({ node: specifier, messageId: "removedType", data: { name } });
          continue;
        }
        const correct = (isType ? TYPE_MODULES_V2 : MODULES_V2).get(name)?.module;
        if (!correct || correct === source) continue;
        pending.push({
          node: specifier,
          messageId: "prefer-source",
          data: { name, source: correct },
          build: (fixer) => moveSpecifierV2(fixer, specifier, node, correct),
        });
      }
    };

    return {
      before() {
        v2 = readSolidVersion(context) === 2;
        pending = [];
      },
      "Program:exit"() {
        for (const { node, messageId, data } of pending) context.report({ node, messageId, data, fix: combinedFix });
      },
      ImportDeclaration(node) {
        if (v2) return checkV2(node);
        const source = node.source?.value;
        if (!isSource(source)) return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const isType = specifier.importKind === "type" || node.importKind === "type";
            const map = isType ? typeMap : primitiveMap;
            // String-literal import names (`import { "x" as y }`) have no `name`.
            const importedName = specifier.imported.type === "Literal" ? undefined : specifier.imported.name;
            const correctSource = importedName === undefined ? undefined : map.get(importedName);
            if (correctSource != null && correctSource !== source) {
              context.report({
                node: specifier,
                messageId: "prefer-source",
                data: { name: importedName, source: correctSource },
                fix(fixer) {
                  const sourceCode = context.sourceCode;
                  const program = sourceCode.ast;
                  const correctDeclaration = program.body.find(
                    (n): n is ESTree.ImportDeclaration =>
                      n.type === "ImportDeclaration" && n.source.value === correctSource,
                  );

                  const specText = sourceCode.getText(specifier);

                  if (correctDeclaration) {
                    const removeResult = removeSpecifierFromNode(fixer, sourceCode, specifier, node);
                    if (!removeResult) return null;
                    // Works for `import "solid-js"` and `import {} from "solid-js"` too (no specifiers).
                    const append = appendImports(fixer, sourceCode, correctDeclaration, [specText]);
                    return append ? [removeResult, append] : null;
                  }

                  const firstSolidDecl = program.body.find(
                    (n): n is ESTree.ImportDeclaration => n.type === "ImportDeclaration" && isSource(n.source.value),
                  );
                  const removeResult = removeSpecifierFromNode(fixer, sourceCode, specifier, node);
                  if (!removeResult) return null;
                  const importKind = isType ? "type " : "";
                  const newImport = `import ${importKind}{ ${specText} } from "${correctSource}";\n`;
                  return [
                    removeResult,
                    firstSolidDecl
                      ? fixer.insertTextBefore(firstSolidDecl, newImport)
                      : fixer.insertTextBeforeRange([0, 0], newImport),
                  ];
                },
              });
            }
          }
        }
      },
    };
  },
});

function removeSpecifierFromNode(
  fixer: Fixer,
  sourceCode: SourceCode,
  specifier: ESTree.ImportDeclarationSpecifier,
  declaration: ESTree.ImportDeclaration,
): Fix | null {
  const specifiers: ReadonlyArray<ESTree.ImportDeclarationSpecifier> = declaration.specifiers ?? [];
  if (specifiers.length === 1) {
    return fixer.remove(declaration);
  }
  const index = specifiers.indexOf(specifier);
  if (index === specifiers.length - 1) {
    const tokenBefore = sourceCode.getTokenBefore(specifier);
    // A non-first specifier always has a `,` before it.
    if (!tokenBefore) return null;
    return fixer.removeRange([tokenBefore.range[0], specifier.range[1]]);
  }
  const tokenAfter = sourceCode.getTokenAfter(specifier);
  // A non-last specifier always has a `,` after it.
  if (!tokenAfter) return null;
  return fixer.removeRange([specifier.range[0], tokenAfter.range[1]]);
}
