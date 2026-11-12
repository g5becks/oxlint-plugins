/**
 * Repo check (audit R10): closure-level mutable state in `createOnce` must be reset per file.
 *
 * oxlint calls a rule's `createOnce` once per worker and reuses the returned visitor for every
 * file that worker lints (the ESLint compat wrapper does the same). State declared in the
 * `createOnce` closure therefore leaks across files unless `before()` resets it.
 *
 * Flagged declarations (directly in a `createOnce` body):
 *   - every `let` / `var`
 *   - `const x = [...] | {...} | new X(...) | f(...)` (arrays, objects, instances, call results)
 * Not flagged: `const` bound to a function, primitive literal, `context`-derived property read,
 * regex, or template.
 *
 * A declaration counts as reset when the `before` hook of the returned visitor reassigns it
 * (`x = ...`), calls `x.clear()` / `x.reset()`, sets `x.length = 0`, or deletes keys (`delete x[k]`), or
 * when it is a per-file handle: `before` calls `x.acquire(...)` and `after` calls `x.release()`
 * (the shared per-file cache pattern of @oxlint/plugins). A declaration that is
 * genuinely immutable can be allowlisted with a comment on the line above:
 *   // createonce-state: immutable (<reason>)
 *
 *   bun scripts/check-createonce-state.ts            # check, exit 1 on violations
 *   bun scripts/check-createonce-state.ts --report   # also print every declaration (audit table)
 *   bun scripts/check-createonce-state.ts <files...> # check specific files
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import ts from "typescript";
import { REPO_ROOT } from "./plugins.ts";

export interface Finding {
  file: string;
  line: number;
  name: string;
  kind: string;
  status: "reset" | "allowlisted" | "NOT RESET";
}

const ALLOW = /createonce-state:\s*immutable\b/;

function initKind(init: ts.Expression | undefined, isLet: boolean): string | null {
  if (!init) return isLet ? "let (uninitialized)" : null;
  let e = init;
  while (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
  if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return isLet ? "let (function)" : null;
  if (ts.isArrayLiteralExpression(e)) return isLet ? "let array" : "array";
  if (ts.isObjectLiteralExpression(e)) return isLet ? "let object" : "object";
  if (ts.isNewExpression(e)) return `${isLet ? "let " : ""}new ${e.expression.getText()}`;
  if (ts.isCallExpression(e)) return `${isLet ? "let " : ""}${e.expression.getText()}(...)`;
  return isLet ? "let" : null;
}

function createOnceBody(node: ts.Node): ts.Block | undefined {
  if (ts.isMethodDeclaration(node) && node.name.getText() === "createOnce") return node.body;
  if (
    ts.isPropertyAssignment(node) &&
    node.name.getText() === "createOnce" &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
    ts.isBlock(node.initializer.body)
  ) {
    return node.initializer.body;
  }
  return undefined;
}

/** The `before` hook body of the visitor object returned directly by createOnce. */
function hook(body: ts.Block, name: "before" | "after"): ts.Node | undefined {
  for (const st of body.statements) {
    if (!ts.isReturnStatement(st) || !st.expression) continue;
    let e = st.expression;
    while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
    if (!ts.isObjectLiteralExpression(e)) continue;
    for (const p of e.properties) {
      if (p.name?.getText() !== name) continue;
      if (ts.isMethodDeclaration(p)) return p.body;
      if (ts.isPropertyAssignment(p)) return p.initializer;
    }
  }
  return undefined;
}

/** Identifiers `x` with a call `x.<method>(...)` inside the hook. */
function callNames(hook: ts.Node | undefined, method: string): Set<string> {
  const names = new Set<string>();
  const visit = (n: ts.Node) => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === method &&
      ts.isIdentifier(n.expression.expression)
    ) {
      names.add(n.expression.expression.text);
    }
    ts.forEachChild(n, visit);
  };
  if (hook) visit(hook);
  return names;
}

function resetNames(hook: ts.Node | undefined): Set<string> {
  const names = new Set<string>();
  if (!hook) return names;
  const visit = (n: ts.Node) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = n.left;
      if (ts.isIdentifier(left)) names.add(left.text);
      if (ts.isPropertyAccessExpression(left) && left.name.text === "length" && ts.isIdentifier(left.expression)) {
        names.add(left.expression.text);
      }
    }
    if (
      ts.isDeleteExpression(n) &&
      ts.isElementAccessExpression(n.expression) &&
      ts.isIdentifier(n.expression.expression)
    ) {
      names.add(n.expression.expression.text); // for (const k of Object.keys(x)) delete x[k]
    }
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ["clear", "reset"].includes(n.expression.name.text) &&
      ts.isIdentifier(n.expression.expression)
    ) {
      names.add(n.expression.expression.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(hook);
  return names;
}

export function checkFile(file: string, text = readFileSync(file, "utf8")): Finding[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const findings: Finding[] = [];
  const visit = (node: ts.Node) => {
    const body = createOnceBody(node);
    if (body) {
      const reset = resetNames(hook(body, "before"));
      // Per-file handles: acquired in before(), released in after().
      const acquired = callNames(hook(body, "before"), "acquire");
      for (const name of callNames(hook(body, "after"), "release")) if (acquired.has(name)) reset.add(name);
      for (const st of body.statements) {
        if (!ts.isVariableStatement(st)) continue;
        const isLet = (st.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== ts.NodeFlags.Const;
        for (const d of st.declarationList.declarations) {
          const kind = initKind(d.initializer, isLet);
          if (!kind) continue;
          const names = ts.isIdentifier(d.name)
            ? [d.name.text]
            : d.name.elements.flatMap((el) =>
                ts.isBindingElement(el) && ts.isIdentifier(el.name) ? [el.name.text] : [],
              );
          const line = sf.getLineAndCharacterOfPosition(d.getStart()).line;
          const above = text.split("\n")[line - 1] ?? "";
          const sameLine = text.split("\n")[line] ?? "";
          for (const name of names) {
            const status = reset.has(name)
              ? "reset"
              : ALLOW.test(above) || ALLOW.test(sameLine)
                ? "allowlisted"
                : "NOT RESET";
            findings.push({ file: relative(REPO_ROOT, file), line: line + 1, name, kind, status });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

async function shippedRuleFiles(): Promise<string[]> {
  const glob = new Bun.Glob("packages/*/src/**/*.ts");
  const files: string[] = [];
  for await (const f of glob.scan({ cwd: REPO_ROOT, absolute: true })) {
    files.push(f);
  }
  return files.sort();
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const report = args.includes("--report");
  const explicit = args.filter((a) => !a.startsWith("--"));
  const files = explicit.length > 0 ? explicit : await shippedRuleFiles();
  const findings = files.flatMap((f) => checkFile(f));
  if (report) {
    console.log("| file:line | state | kind | status |\n|---|---|---|---|");
    for (const f of findings) console.log(`| ${f.file}:${f.line} | \`${f.name}\` | ${f.kind} | ${f.status} |`);
  }
  const bad = findings.filter((f) => f.status === "NOT RESET");
  for (const f of bad) {
    console.error(`${f.file}:${f.line}: \`${f.name}\` (${f.kind}) is createOnce closure state not reset in before()`);
  }
  console.log(`createOnce state: ${findings.length} declarations, ${bad.length} not reset`);
  process.exit(bad.length > 0 ? 1 : 0);
}
