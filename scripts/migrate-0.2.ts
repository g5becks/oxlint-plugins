/**
 * Codemod for the 0.2 release of the oxlint-plugin-* packages (oxlint >= 1.70).
 *
 * oxlint 1.70 names JS-plugin rules `<name>/<rule>` instead of `oxlint-plugin-<name>/<rule>`.
 * Long-form disable comments stop working there, and the short form doesn't exist before 1.70,
 * so suppressions, config keys and the oxlint version must change together. This script
 * rewrites the plugin prefix:
 *
 *   - in disable/enable comments (`oxlint-disable`, `oxlint-disable-next-line`,
 *     `oxlint-disable-line`, `oxlint-enable`, and the `eslint-*` variants; line and block
 *     comments; several rules per comment) in JS/TS source files;
 *   - in rule keys of oxlint config files (`.oxlintrc.json`, `.oxlintrc.jsonc`, ...; JSONC
 *     comments are fine): only strings used as object keys that are exactly
 *     `oxlint-plugin-<name>/<rule>`, so `jsPlugins` entries and package paths are never touched.
 *
 * Prefixes: oxlint-plugin-{immutable,ts-no-assert,errorset,query,router,solidjs}/ -> {...}/,
 * and the pre-publish names oxlint-plugin-functional/ -> immutable/, oxlint-plugin-solid/ -> solidjs/.
 *
 * Usage (Node >= 22.18 or Bun; no dependencies):
 *   node migrate-0.2.ts [paths...]            # rewrite files (default path: .)
 *   node migrate-0.2.ts --dry-run [paths...]  # print what would change, write nothing
 *   node migrate-0.2.ts --check [paths...]    # exit 1 if anything needs migrating
 * node_modules, .git, dist, build and coverage directories are skipped.
 *
 * Comments are found with a regex scanner, not a parser: a directive-looking `// ...` inside a
 * string literal is rewritten too. That is harmless for real code; review the diff as usual.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PREFIX_MAP: Readonly<Record<string, string>> = {
  immutable: "immutable",
  "ts-no-assert": "ts-no-assert",
  errorset: "errorset",
  query: "query",
  router: "router",
  solidjs: "solidjs",
  // pre-publish names
  functional: "immutable",
  solid: "solidjs",
};

// `solidjs` must come before `solid` in the alternation.
const NAMES = Object.keys(PREFIX_MAP)
  .sort((a, b) => b.length - a.length)
  .join("|");
const RULE = "[a-z0-9][a-z0-9-]*";
const LONG_IN_COMMENT = new RegExp(`(^|[^\\w@/.-])oxlint-plugin-(${NAMES})/(?=${RULE})`, "g");
const DIRECTIVE = /\b(?:oxlint|eslint)-(?:disable|enable)(?:-next-line|-line)?\b/;
const COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
const CONFIG_KEY = new RegExp(`"oxlint-plugin-(${NAMES})/(${RULE})"(\\s*:)`, "g");

export const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

export interface Result {
  text: string;
  /** Number of prefixes rewritten. */
  count: number;
}

/** Rewrite long-form plugin prefixes inside disable/enable directive comments. */
export function migrateSource(text: string): Result {
  let count = 0;
  const out = text.replace(COMMENT, (comment) => {
    if (!DIRECTIVE.test(comment)) return comment;
    return comment.replace(LONG_IN_COMMENT, (_m, before: string, name: string) => {
      count++;
      return `${before}${PREFIX_MAP[name]}/`;
    });
  });
  return { text: out, count };
}

/** Rewrite long-form rule keys in an oxlint JSON/JSONC config. */
export function migrateConfig(text: string): Result {
  let count = 0;
  const out = text.replace(CONFIG_KEY, (_m, name: string, rule: string, colon: string) => {
    count++;
    return `"${PREFIX_MAP[name]}/${rule}"${colon}`;
  });
  return { text: out, count };
}

export function isOxlintConfig(file: string): boolean {
  return /^\.?oxlintrc(?:\.[\w-]+)?\.jsonc?$/.test(basename(file));
}

function* walk(path: string): Generator<string> {
  const st = statSync(path);
  if (st.isFile()) {
    yield path;
    return;
  }
  if (!st.isDirectory()) return;
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    yield* walk(join(path, entry));
  }
}

export interface FileChange {
  file: string;
  kind: "suppressions" | "config keys";
  count: number;
}

/** Migrate every file under `paths`; returns the changes (written unless `write` is false). */
export function migratePaths(paths: string[], write: boolean): FileChange[] {
  const changes: FileChange[] = [];
  for (const root of paths) {
    for (const file of walk(resolve(root))) {
      const config = isOxlintConfig(file);
      if (!config && !SOURCE_EXTENSIONS.has(extname(file))) continue;
      const before = readFileSync(file, "utf8");
      const { text, count } = config ? migrateConfig(before) : migrateSource(before);
      if (count === 0) continue;
      changes.push({ file, kind: config ? "config keys" : "suppressions", count });
      if (write) writeFileSync(file, text);
    }
  }
  return changes;
}

const isMain = process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const check = args.includes("--check");
  const paths = args.filter((a) => !a.startsWith("--"));
  const changes = migratePaths(paths.length > 0 ? paths : ["."], !dryRun && !check);
  for (const c of changes) console.log(`${c.file}: ${c.count} ${c.kind}`);
  const suppressions = changes.filter((c) => c.kind === "suppressions");
  const configs = changes.filter((c) => c.kind === "config keys");
  const sum = (cs: FileChange[]) => cs.reduce((n, c) => n + c.count, 0);
  const verb = dryRun || check ? "to migrate" : "migrated";
  console.log(
    `${verb}: ${sum(suppressions)} suppression(s) in ${suppressions.length} file(s), ` +
      `${sum(configs)} config key(s) in ${configs.length} file(s)`,
  );
  if (check && changes.length > 0) process.exit(1);
}
