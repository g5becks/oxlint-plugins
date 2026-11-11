/**
 * Upstream parity report (audit T5): run the original ESLint plugins and the oxlint ports over the
 * same corpus and report per-rule recall and precision with a site-level diff.
 *
 *   bun scripts/parity.ts [--corpus <dir>] [--out <report.md>]
 *
 * Upstream plugins (exact devDependencies): eslint-plugin-solid 0.19.0,
 * @tanstack/eslint-plugin-query 5.107.1, @tanstack/eslint-plugin-router 1.162.0,
 * eslint-plugin-functional 10.0.1 (type-aware, through typescript-eslint's project service).
 * The ports are built and run through the pinned oxlint (or OXLINT_BIN).
 *
 * The corpus (default tests/fixtures/corpus) is copied to a temp dir with every
 * `eslint-disable*` / `oxlint-disable*` directive blanked (line numbers kept), so neither side
 * is suppressed. A site is (rule, file, line). recall = shared / upstream, precision = shared / port.
 * Advisory: always exits 0 unless the tooling itself fails.
 */
import { $ } from "bun";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import tsParser from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import { PLUGIN_NAMES, REPO_ROOT, distEntry } from "./plugins.ts";

type Entry = [string, ...unknown[]] | string;
interface Pair {
  /** Port rule key, e.g. `solidjs/reactivity`. */
  port: string;
  portEntry?: Entry;
  /** Upstream rule id, e.g. `solid/reactivity`. */
  upstream: string;
  upstreamEntry?: Entry;
}

const SOLID_RULES = [
  "components-return-once",
  "event-handlers",
  "imports",
  "jsx-no-duplicate-props",
  "jsx-no-script-url",
  "jsx-no-undef",
  "jsx-uses-vars",
  "no-array-handlers",
  "no-destructure",
  "no-innerhtml",
  "no-proxy-apis",
  "no-react-deps",
  "no-react-specific-props",
  "no-unknown-namespaces",
  "prefer-classlist",
  "prefer-for",
  "prefer-show",
  "reactivity",
  "self-closing-comp",
  "style-prop",
];
const QUERY_RULES = [
  "exhaustive-deps",
  "infinite-query-property-order",
  "mutation-property-order",
  "no-rest-destructuring",
  "no-unstable-deps",
  "stable-query-client",
];

const PAIRS: Pair[] = [
  ...SOLID_RULES.map((r) => ({ port: `solidjs/${r}`, upstream: `solid/${r}` })),
  ...QUERY_RULES.map((r) => ({ port: `query/${r}`, upstream: `@tanstack/query/${r}` })),
  { port: "router/create-route-property-order", upstream: "@tanstack/router/create-route-property-order" },
  // The immutable port is syntactic and ReadonlyShallow; configure upstream to match.
  ...[
    "no-let",
    "no-throw-statements",
    "no-promise-reject",
    "immutable-data",
    "prefer-property-signatures",
    "readonly-type",
  ].map((r) => ({ port: `immutable/${r}`, upstream: `functional/${r}` })),
  {
    port: "immutable/prefer-immutable-types",
    upstream: "functional/prefer-immutable-types",
    upstreamEntry: ["warn", { enforcement: "ReadonlyShallow" }],
  },
  {
    port: "immutable/type-declaration-immutability",
    upstream: "functional/type-declaration-immutability",
    upstreamEntry: [
      "warn",
      {
        rules: [{ identifiers: "^.+$", immutability: "ReadonlyShallow", comparator: "AtLeast" }],
        ignoreInterfaces: false,
      },
    ],
  },
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function* files(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(e)) yield p;
  }
}

const corpus = resolve(arg("--corpus") ?? join(REPO_ROOT, "tests", "fixtures", "corpus"));
const work = mkdtempSync(join(tmpdir(), "parity-"));
const root = join(work, "corpus");

try {
  // 1. Corpus copy without suppression directives (same line numbers).
  cpSync(corpus, root, { recursive: true });
  for (const f of files(root)) {
    const text = readFileSync(f, "utf8").replace(
      /\/\/\s*(eslint|oxlint)-(disable|enable)[^\n]*/g,
      "// (directive removed)",
    );
    writeFileSync(
      f,
      text.replace(/\/\*\s*(eslint|oxlint)-(disable|enable)[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")),
    );
  }
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        jsx: "preserve",
        jsxImportSource: "solid-js",
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        noEmit: true,
        skipLibCheck: true,
      },
      include: ["**/*.ts", "**/*.tsx"],
    }),
  );
  const fileCount = [...files(root)].length;

  // 2. Upstream ESLint plugins.
  const load = async (m: string) => {
    const x = await import(m);
    return x.default ?? x;
  };
  const [solid, query, router, functional] = await Promise.all(
    [
      "eslint-plugin-solid",
      "@tanstack/eslint-plugin-query",
      "@tanstack/eslint-plugin-router",
      "eslint-plugin-functional",
    ].map(load),
  );
  const makeEslint = (disabled: ReadonlySet<string>) =>
    new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.ts", "**/*.tsx"],
          languageOptions: {
            parser: tsParser,
            parserOptions: { projectService: true, tsconfigRootDir: root, ecmaFeatures: { jsx: true } },
          },
          plugins: { solid, "@tanstack/query": query, "@tanstack/router": router, functional },
          linterOptions: { reportUnusedDisableDirectives: "off" },
          rules: Object.fromEntries(
            PAIRS.map((p) => [p.upstream, disabled.has(p.upstream) ? "off" : (p.upstreamEntry ?? "warn")]),
          ) as never,
        },
      ],
    });
  const upstreamSites = new Map<string, Set<string>>();
  const crashes: string[] = [];
  /** `<port rule>|<file>` pairs left out of the comparison because the upstream rule crashed. */
  const excluded = new Set<string>();
  const base = makeEslint(new Set());
  for (const file of files(root)) {
    const rel = relative(root, file);
    const disabled = new Set<string>();
    let results: ESLint.LintResult[] | undefined;
    // An upstream rule that throws aborts the whole file in ESLint: drop that rule for this
    // file, record it, and leave the (rule, file) pair out of the comparison.
    for (let attempt = 0; attempt < PAIRS.length && !results; attempt++) {
      try {
        results = await (disabled.size === 0 ? base : makeEslint(disabled)).lintFiles([file]);
      } catch (error) {
        const rule = /Rule: "([^"]+)"/.exec(String((error as Error).message))?.[1];
        const pair = PAIRS.find((p) => p.upstream === rule);
        if (!rule || !pair) throw error;
        disabled.add(rule);
        excluded.add(`${pair.port}|${rel}`);
        crashes.push(`upstream \`${rule}\` threw on ${rel}: ${String((error as Error).message).split("\n")[0]}`);
      }
    }
    for (const m of results?.[0]?.messages ?? []) {
      if (!m.ruleId) {
        crashes.push(`upstream ${rel}:${m.line}: ${m.message}`);
        continue;
      }
      const pair = PAIRS.find((p) => p.upstream === m.ruleId);
      if (!pair) continue;
      const set = upstreamSites.get(pair.port) ?? new Set();
      set.add(`${rel}:${m.line}`);
      upstreamSites.set(pair.port, set);
    }
  }

  // 3. Ports through oxlint.
  await $`bun scripts/build.ts`.cwd(REPO_ROOT).quiet();
  const config = join(work, ".oxlintrc.json");
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: PLUGIN_NAMES.map((n) => distEntry(n)),
      rules: Object.fromEntries(PAIRS.map((p) => [p.port, p.portEntry ?? "warn"])),
    }),
  );
  const bin = process.env.OXLINT_BIN ?? join(REPO_ROOT, "node_modules", ".bin", "oxlint");
  const res = await $`${bin} -c ${config} -A all --format json ${root}`.cwd(root).nothrow().quiet();
  const parsed = JSON.parse(res.stdout.toString()) as {
    diagnostics: Array<{ code: string; message: string; filename: string; labels: Array<{ span: { line: number } }> }>;
  };
  const portSites = new Map<string, Set<string>>();
  for (const d of parsed.diagnostics) {
    const m = /^(?:oxlint-plugin-)?([a-z-]+)\(([a-z-]+)\)$/.exec(d.code);
    if (!m) continue;
    const key = `${m[1]}/${m[2]}`;
    if (d.message.startsWith("Error running JS plugin")) crashes.push(`port ${d.filename}: ${d.message}`);
    if (!PAIRS.some((p) => p.port === key)) continue;
    const rel = relative(root, resolve(root, d.filename));
    if (excluded.has(`${key}|${rel}`)) continue;
    const set = portSites.get(key) ?? new Set();
    set.add(`${rel}:${d.labels[0]?.span.line ?? 0}`);
    portSites.set(key, set);
  }

  // 4. Report.
  const pct = (a: number, b: number) => (b === 0 ? "n/a" : `${((100 * a) / b).toFixed(1)}%`);
  let up = 0;
  let po = 0;
  let both = 0;
  const rows: string[] = [];
  const diffs: string[] = [];
  for (const pair of PAIRS) {
    const u = upstreamSites.get(pair.port) ?? new Set<string>();
    const p = portSites.get(pair.port) ?? new Set<string>();
    const shared = [...u].filter((s) => p.has(s));
    up += u.size;
    po += p.size;
    both += shared.length;
    rows.push(
      `| \`${pair.port}\` | ${u.size} | ${p.size} | ${shared.length} | ${pct(shared.length, u.size)} | ${pct(shared.length, p.size)} |`,
    );
    const onlyU = [...u].filter((s) => !p.has(s)).sort();
    const onlyP = [...p].filter((s) => !u.has(s)).sort();
    if (onlyU.length || onlyP.length) {
      diffs.push(`### \`${pair.port}\``, "");
      for (const s of onlyU) diffs.push(`- upstream only: \`${s}\``);
      for (const s of onlyP) diffs.push(`- port only: \`${s}\``);
      diffs.push("");
    }
  }
  const groups = [...new Set(PAIRS.map((p) => p.port.split("/")[0] ?? ""))].map((g) => {
    let gu = 0;
    let gp = 0;
    let gb = 0;
    for (const pair of PAIRS.filter((p) => p.port.startsWith(`${g}/`))) {
      const u = upstreamSites.get(pair.port) ?? new Set<string>();
      const p = portSites.get(pair.port) ?? new Set<string>();
      gu += u.size;
      gp += p.size;
      gb += [...u].filter((x) => p.has(x)).length;
    }
    return `| ${g} | ${gu} | ${gp} | ${gb} | ${pct(gb, gu)} | ${pct(gb, gp)} |`;
  });
  const versions = Object.fromEntries(
    [
      "eslint",
      "eslint-plugin-solid",
      "@tanstack/eslint-plugin-query",
      "@tanstack/eslint-plugin-router",
      "eslint-plugin-functional",
      "oxlint",
    ].map((m) => [m, JSON.parse(readFileSync(join(REPO_ROOT, "node_modules", m, "package.json"), "utf8")).version]),
  );
  const report = [
    "# Upstream parity report",
    "",
    `Corpus: \`${relative(REPO_ROOT, corpus) || corpus}\` (${fileCount} files, directives removed). Versions: ${Object.entries(
      versions,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}.`,
    "",
    `**Total: upstream ${up}, port ${po}, shared ${both}; recall ${pct(both, up)}, precision ${pct(both, po)}.**` +
      (excluded.size ? ` (${excluded.size} rule/file pairs excluded: the upstream rule threw.)` : ""),
    "",
    "| Plugin | Upstream | Port | Shared | Recall | Precision |",
    "|---|---|---|---|---|---|",
    ...groups,
    "",
    "| Rule | Upstream | Port | Shared | Recall | Precision |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
    crashes.length ? `## Crashes\n\n${crashes.map((c) => `- ${c}`).join("\n")}\n` : "No crashes on either side.\n",
    "## Site differences",
    "",
    ...(diffs.length ? diffs : ["None."]),
  ].join("\n");
  const out = arg("--out");
  if (out) writeFileSync(out, report);
  console.log(report);
} finally {
  rmSync(work, { recursive: true, force: true });
}
