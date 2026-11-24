import { defineRule, type ESTree, type Fix, type Fixer, type Scope, type Variable } from "@oxlint/plugins";
import { removeImportSpecifier } from "../utils/fix-imports.ts";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { REMOVED_V2, RENAMES_V2, SOLID1_MODULES } from "../utils/solid2.ts";
import { walkTree } from "../utils/walk.ts";

// TASK-045. Reports 1.x APIs that Solid 2.0 removed (settings.solidjs.version 2 only) and autofixes
// the 1:1 renames when every use site is safe to rename. The tables and their MIGRATION/RFC
// citations are in utils/solid2.ts; docs/rules/no-removed-apis.md explains each fix.

/** Modules whose imports are checked: 1.x's, plus @solidjs/web. */
const SOURCES: ReadonlySet<string> = new Set([...SOLID1_MODULES, "@solidjs/web"]);
/** Import paths that are the project's own code (relative, or a common alias). */
const PROJECT_PATH = /^(?:\.{1,2}\/|~\/|@\/|#)/;

type Specifier = ESTree.ImportSpecifier;
type Identifier = Extract<ESTree.Node, { type: "Identifier" }>;
type JSXName = ESTree.JSXIdentifier;
type Opening = ESTree.JSXOpeningElement;

interface SolidImport {
  specifier: Specifier;
  declaration: ESTree.ImportDeclaration;
  imported: string;
}

/** The outcome of checking one API's use sites: extra fixes, or why there is no fix. */
type UsagePlan = { fixes: (fixer: Fixer) => Fix[] } | { reason: string };

const CAVEATS: Record<string, string> = {
  mergeProps: "an explicit `undefined` now overrides a default instead of being skipped; check the call sites",
  unwrap: "it returns a copy where the store changed, so code that mutates the result behaves differently",
};

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow Solid 1.x APIs that Solid 2.0 removed, and fix the 1:1 renames (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-removed-apis.md",
    },
    fixable: "code" as const,
    hasSuggestions: true,
    schema: [],
    messages: {
      renamed: "`{{name}}` is `{{to}}` in Solid 2.0.",
      renamedNoFix: "`{{name}}` is `{{to}}` in Solid 2.0. Not fixed automatically: {{reason}}.",
      renamedReview: "`{{name}}` is `{{to}}` in Solid 2.0, but {{caveat}}.",
      suggestRename: "Rename `{{name}}` to `{{to}}`.",
      removed: "`{{name}}` was removed in Solid 2.0. Use {{replacement}}.",
      provider: "In Solid 2.0 a context is its own provider: use `<{{context}}>` instead of `<{{context}}.Provider>`.",
      providerNoFix:
        "In Solid 2.0 a context is its own provider: if `{{context}}` is a Solid context, use `<{{context}}>` instead of `<{{context}}.Provider>`.",
      once: "The `/*@once*/` marker was removed in Solid 2.0. Keep the read reactive, use a default prop such as `defaultValue`, or `untrack()` in JavaScript for a one-time read.",
    },
  },
  createOnce(context) {
    let solidImports: SolidImport[] = [];
    /** Fixable reports of the current file; they share one combined fix (combinedFix). */
    let fixable: Array<{
      node: ESTree.Node;
      messageId: "renamed" | "provider";
      data: Record<string, string>;
      build: (fixer: Fixer) => Fix[] | null;
    }> = [];
    let jsxNames: JSXName[] = [];
    let providers: Opening[] = [];

    const sourceCode = () => context.sourceCode;

    const resolve = (node: ESTree.Node, name: string): Variable | null => {
      for (let scope: Scope | null = sourceCode().getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(name);
        if (variable) return variable;
      }
      return null;
    };

    /** Whether introducing `name` as a module binding could capture or shadow anything. */
    const nameTaken = (name: string): boolean => {
      const manager = sourceCode().scopeManager;
      if (manager?.scopes.some((s) => s.variables.some((v) => v.name === name))) return true;
      if (manager?.globalScope?.through.some((r) => r.identifier.name === name)) return true;
      return jsxNames.some((n) => n.name === name);
    };

    /** The Solid import a local name refers to at a node, if any. */
    const solidImportAt = (node: ESTree.Node, local: string): SolidImport | undefined => {
      const variable = resolve(node, local);
      return variable
        ? solidImports.find((s) => s.specifier.local.name === local && variableOf(s) === variable)
        : undefined;
    };

    const variableOf = (s: SolidImport): Variable | undefined =>
      sourceCode().scopeManager?.getDeclaredVariables(s.specifier)?.[0];

    /** JSX tag names and other identifiers that refer to an import. */
    const referencesOf = (s: SolidImport) => {
      const variable = variableOf(s);
      const local = s.specifier.local.name;
      const jsx = jsxNames.filter((n) => n.name === local && resolve(n, local) === variable);
      const other = (variable?.references ?? [])
        .map((r) => r.identifier)
        .filter((id): id is Identifier => id.type === "Identifier" && id !== s.specifier.local);
      return { jsx, other };
    };

    const openingOf = (name: JSXName): Opening | null =>
      name.parent?.type === "JSXOpeningElement" ? name.parent : null;

    const attribute = (opening: Opening, name: string) =>
      opening.attributes.find(
        (a): a is ESTree.JSXAttribute =>
          a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === name,
      );

    const stringValue = (attr: ESTree.JSXAttribute): string | null => {
      const v = attr.value;
      if (v?.type === "Literal" && typeof v.value === "string") return v.value;
      if (
        v?.type === "JSXExpressionContainer" &&
        v.expression.type === "Literal" &&
        typeof v.expression.value === "string"
      ) {
        return v.expression.value;
      }
      return null;
    };

    /** Remove an attribute and the whitespace before it. */
    const removeAttribute = (fixer: Fixer, attr: ESTree.JSXAttribute): Fix => {
      const before = sourceCode().getTokenBefore(attr);
      return fixer.removeRange([before ? before.range[1] : attr.range[0], attr.range[1]]);
    };

    // ---- Per-API use-site checks ----

    /** ErrorBoundary → Errored: the fallback's error becomes an accessor (RFC 03 §Errored). */
    const planErrored = (refs: ReturnType<typeof referencesOf>): UsagePlan => {
      if (refs.other.length > 0) return { reason: "it's used outside JSX" };
      const edits: Array<(fixer: Fixer) => Fix> = [];
      for (const name of refs.jsx) {
        const opening = openingOf(name);
        const fallback = opening && attribute(opening, "fallback");
        if (!fallback || fallback.value?.type !== "JSXExpressionContainer") continue;
        const expr = fallback.value.expression;
        if (!isFunctionNode(expr)) {
          if (["JSXElement", "JSXFragment", "Literal", "TemplateLiteral", "JSXEmptyExpression"].includes(expr.type))
            continue;
          return {
            reason: "its fallback isn't an inline function or element, so the error parameter can't be checked",
          };
        }
        const param = expr.params[0];
        if (!param) continue;
        if (param.type !== "Identifier") {
          return { reason: "the fallback's error parameter is destructured, and in 2.0 it's an accessor (`err()`)" };
        }
        const variable = sourceCode()
          .scopeManager?.getDeclaredVariables(expr)
          ?.find((v) => v.name === param.name);
        for (const ref of variable?.references ?? []) {
          if (ref.init) continue;
          if (ref.isWrite()) return { reason: `the fallback reassigns \`${param.name}\`` };
          const id = ref.identifier;
          const parent = id.parent;
          if (parent?.type === "Property" && parent.shorthand && parent.value === id) {
            edits.push((fixer) => fixer.replaceText(parent, `${param.name}: ${param.name}()`));
          } else {
            edits.push((fixer) => fixer.replaceText(id, `${param.name}()`));
          }
        }
      }
      return { fixes: (fixer) => edits.map((e) => e(fixer)) };
    };

    /** SuspenseList → Reveal: revealOrder/tail map to order/collapsed (MIGRATION §SuspenseList → Reveal). */
    const planReveal = (refs: ReturnType<typeof referencesOf>): UsagePlan => {
      if (refs.other.length > 0) return { reason: "it's used outside JSX" };
      const edits: Array<(fixer: Fixer) => Fix> = [];
      for (const name of refs.jsx) {
        const opening = openingOf(name);
        if (!opening) continue;
        if (opening.attributes.some((a) => a.type === "JSXSpreadAttribute")) {
          return { reason: "a spread may set `revealOrder` or `tail`" };
        }
        const order = attribute(opening, "revealOrder");
        if (order) {
          const value = stringValue(order);
          if (value === "forwards") edits.push((fixer) => removeAttribute(fixer, order));
          else if (value === "together") edits.push((fixer) => fixer.replaceText(order, `order="together"`));
          else
            return {
              reason:
                value === null
                  ? "`revealOrder` isn't a string literal"
                  : `\`revealOrder="${value}"\` has no 2.0 equivalent`,
            };
        }
        const tail = attribute(opening, "tail");
        if (tail) {
          const value = stringValue(tail);
          if (value === "collapsed") edits.push((fixer) => fixer.replaceText(tail, "collapsed"));
          else
            return {
              reason: value === null ? "`tail` isn't a string literal" : `\`tail="${value}"\` has no 2.0 equivalent`,
            };
        }
      }
      return { fixes: (fixer) => edits.map((e) => e(fixer)) };
    };

    /** onMount → onSettled: only when the callback is safe inside onSettled (RFC 08). */
    const planOnSettled = (refs: ReturnType<typeof referencesOf>): UsagePlan => {
      if (refs.jsx.length > 0) return { reason: "it's used in JSX" };
      const edits: Array<(fixer: Fixer) => Fix> = [];
      for (const id of refs.other) {
        const call = id.parent;
        if (call?.type !== "CallExpression" || call.callee !== id) return { reason: "it's used other than as a call" };
        const callback = call.arguments[0];
        if (call.arguments.length !== 1 || !isFunctionNode(callback)) {
          return { reason: "its callback isn't an inline function" };
        }
        if (callback.async || callback.generator) {
          return { reason: "its callback is async; onSettled's callback must return a cleanup function or nothing" };
        }
        const problem = onSettledProblem(callback);
        if (problem) return { reason: problem };
        if (callback.type === "ArrowFunctionExpression" && callback.body.type !== "BlockStatement") {
          // An expression body would become onSettled's return value ("Invalid cleanup return value").
          const arrow = sourceCode().getTokenBefore(callback.body, { filter: (t) => t.value === "=>" });
          if (!arrow) return { reason: "its callback couldn't be rewritten" };
          const start = sourceCode().getTokenAfter(arrow)!.range[0];
          // As written, parentheses included: `() => ({ a })` must stay an object, not become a block.
          const text = sourceCode().text.slice(start, callback.range[1]);
          edits.push((fixer) => fixer.replaceTextRange([start, callback.range[1]], `{ ${text}; }`));
        }
      }
      return { fixes: (fixer) => edits.map((e) => e(fixer)) };
    };

    const onSettledProblem = (callback: FunctionNode): string | null => {
      let problem: string | null = null;
      if (!callback.body) return null;
      walkTree(callback.body, (node, skip) => {
        if (problem) return skip();
        if (isFunctionNode(node)) return skip(); // runs later, not in onSettled's own body
        if (node.type === "ReturnStatement" && node.argument) {
          problem = "its callback returns a value, which onSettled would treat as a cleanup";
        } else if (node.type === "CallExpression" && node.callee.type === "Identifier") {
          const imported = solidImportAt(node, node.callee.name)?.imported;
          if (imported === "onCleanup")
            problem = "its callback calls onCleanup; return the cleanup from onSettled instead";
          else if (imported === "flush") problem = "its callback calls flush(), which onSettled doesn't allow";
          else if (imported && /^create[A-Z]/.test(imported) && imported !== "createUniqueId") {
            problem = `its callback creates a reactive primitive (${imported}), which onSettled doesn't allow`;
          }
        }
      });
      return problem;
    };

    /** Index → For keyed={false}: the callback shape is the same (RFC 03 §Index → For keyed={false}). */
    const planFor = (refs: ReturnType<typeof referencesOf>): UsagePlan => {
      if (refs.other.length > 0) return { reason: "it's used outside JSX" };
      for (const name of refs.jsx) {
        const opening = openingOf(name);
        if (!opening) continue;
        if (opening.attributes.some((a) => a.type === "JSXSpreadAttribute"))
          return { reason: "a spread may set `keyed`" };
        if (attribute(opening, "keyed")) return { reason: "it already has a `keyed` prop" };
      }
      return { fixes: () => [] };
    };

    const planOf = (imported: string, refs: ReturnType<typeof referencesOf>): UsagePlan => {
      switch (imported) {
        case "ErrorBoundary":
          return planErrored(refs);
        case "SuspenseList":
          return planReveal(refs);
        case "onMount":
          return planOnSettled(refs);
        case "Index":
          return planFor(refs);
        default:
          return { fixes: () => [] };
      }
    };

    // ---- Renames ----

    const checkRename = (s: SolidImport) => {
      const entry = RENAMES_V2.get(s.imported)!;
      const { to } = entry;
      const local = s.specifier.local.name;
      const aliased = local !== s.imported;
      const refs = referencesOf(s);
      const data = { name: s.imported, to };
      const noFix = (reason: string) =>
        context.report({ node: s.specifier, messageId: "renamedNoFix", data: { ...data, reason } });

      // The local name after the fix, and the fix for the specifier itself.
      let newLocal = local;
      let specifierFix: (fixer: Fixer) => Fix | null;
      const existing = aliased ? undefined : solidImports.find((o) => o !== s && o.imported === to);
      if (aliased) {
        specifierFix = (fixer) => fixer.replaceText(s.specifier.imported, to);
      } else if (existing) {
        newLocal = existing.specifier.local.name;
        specifierFix = (fixer) => removeImportSpecifier(fixer, sourceCode(), s.specifier, s.declaration);
      } else if (nameTaken(to)) {
        return noFix(`the name \`${to}\` is already used in this file`);
      } else {
        newLocal = to;
        specifierFix = (fixer) => fixer.replaceText(s.specifier, to);
      }

      const plan = planOf(s.imported, refs);
      if ("reason" in plan) return noFix(plan.reason);

      const fix = (fixer: Fixer): Fix[] | null => {
        const fixes: Fix[] = [];
        const first = specifierFix(fixer);
        if (!first) return null;
        fixes.push(first);
        for (const id of [...refs.jsx, ...refs.other]) {
          const opening = s.imported === "Index" ? (id.type === "JSXIdentifier" ? openingOf(id) : null) : null;
          if (opening) {
            // <Index each={x}> → <For each={x} keyed={false}>, with the attribute after the others.
            const last = opening.attributes.at(-1);
            if (last) {
              if (newLocal !== local) fixes.push(fixer.replaceText(id, newLocal));
              fixes.push(fixer.insertTextAfter(last, " keyed={false}"));
            } else {
              fixes.push(fixer.replaceText(id, `${newLocal} keyed={false}`));
            }
          } else if (newLocal !== local) {
            fixes.push(fixer.replaceText(id, newLocal));
          }
        }
        fixes.push(...plan.fixes(fixer));
        return fixes;
      };

      if (entry.apply === "suggest") {
        context.report({
          node: s.specifier,
          messageId: "renamedReview",
          data: { ...data, caveat: CAVEATS[s.imported] ?? "it behaves differently" },
          suggest: [{ messageId: "suggestRename", data, fix }],
        });
      } else {
        fixable.push({ node: s.specifier, messageId: "renamed", data, build: fix });
      }
    };

    // ---- Providers ----

    const checkProvider = (opening: Opening) => {
      const name = opening.name as ESTree.JSXMemberExpression;
      const object = name.object as JSXName;
      const variable = resolve(opening, object.name);
      // A TypeScript type of the same name shares the variable: use its value definition.
      const def = variable?.defs.find((d) => d.node.type === "VariableDeclarator" || d.type === "ImportBinding");
      let isFixable = false;
      if (def?.node.type === "VariableDeclarator") {
        const init = def.node.init;
        isFixable =
          init?.type === "CallExpression" &&
          init.callee.type === "Identifier" &&
          solidImportAt(init, init.callee.name)?.imported === "createContext";
      } else if (def?.type === "ImportBinding") {
        const declaration = (def.parent ?? def.node.parent) as ESTree.ImportDeclaration | undefined;
        isFixable = typeof declaration?.source?.value === "string" && PROJECT_PATH.test(declaration.source.value);
      }
      const data = { context: object.name };
      if (!isFixable) {
        context.report({ node: name, messageId: "providerNoFix", data });
        return;
      }
      fixable.push({
        node: name,
        messageId: "provider",
        data,
        build: (fixer) => {
          const fixes = [fixer.replaceText(name, object.name)];
          const closing = opening.parent?.type === "JSXElement" ? opening.parent.closingElement : null;
          if (closing) fixes.push(fixer.replaceText(closing.name, object.name));
          return fixes;
        },
      });
    };

    /**
     * One fix for every fixable report of the file. Each rename spans its import specifier and
     * every use, so separate fixes would overlap and oxlint --fix (one pass per run) would need a
     * run per rename; applied together, the file never holds a half-renamed import. A rename whose
     * edits would overlap ones already taken is left for the next pass.
     */
    const combinedFix = (fixer: Fixer): Fix[] => {
      const accepted: Fix[] = [];
      for (const { build } of fixable) {
        const fixes = build(fixer);
        if (!fixes) continue;
        const overlaps = fixes.some((f) => accepted.some((a) => f.range[0] < a.range[1] && a.range[0] < f.range[1]));
        if (!overlaps) accepted.push(...fixes);
      }
      return accepted;
    };

    return {
      before() {
        solidImports = [];
        fixable = [];
        jsxNames = [];
        providers = [];
        // Nothing is removed on 1.x: the rule only runs at settings.solidjs.version 2.
        return readSolidVersion(context) === 2;
      },
      ImportDeclaration(node) {
        if (node.importKind === "type" || typeof node.source.value !== "string" || !SOURCES.has(node.source.value))
          return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") continue;
          if (specifier.imported.type !== "Identifier") continue;
          solidImports.push({ specifier, declaration: node, imported: specifier.imported.name });
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type === "JSXIdentifier") jsxNames.push(node.name);
        else if (
          node.name.type === "JSXMemberExpression" &&
          node.name.property.name === "Provider" &&
          node.name.object.type === "JSXIdentifier"
        ) {
          providers.push(node);
        }
      },
      JSXClosingElement(node) {
        if (node.name.type === "JSXIdentifier") jsxNames.push(node.name);
      },
      "Program:exit"() {
        for (const s of solidImports) {
          if (RENAMES_V2.has(s.imported)) checkRename(s);
          else if (REMOVED_V2.has(s.imported)) {
            context.report({
              node: s.specifier,
              messageId: "removed",
              data: { name: s.imported, replacement: REMOVED_V2.get(s.imported)!.replacement },
            });
          }
        }
        for (const opening of providers) checkProvider(opening);
        for (const { node, messageId, data } of fixable) {
          context.report({ node, messageId, data, fix: combinedFix });
        }
        for (const comment of sourceCode().getAllComments()) {
          if (comment.type === "Block" && comment.value.trim() === "@once") {
            context.report({ loc: comment.loc, messageId: "once" });
          }
        }
      },
    };
  },
});
