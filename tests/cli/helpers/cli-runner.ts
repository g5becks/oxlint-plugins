import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { oxlintBin } from "../../helpers/oxlint-bin.ts";
import { PLUGIN_NAMES, type PluginName, entryPoint } from "../../../scripts/plugins.ts";

const ROOT = join(import.meta.dir, "..", "..", "..");

/**
 * Bundles are built into a per-process temp directory (never into the repo),
 * once per plugin, and removed when the test process exits.
 */
const BUILD_DIR = mkdtempSync(join(tmpdir(), "oxlint-cli-dist-"));
process.on("exit", () => rmSync(BUILD_DIR, { recursive: true, force: true }));

export interface Diagnostic {
  message: string;
  /** Normalized code: `<plugin>(<rule>)` whatever the oxlint version printed. */
  code: string;
  /** Code exactly as oxlint printed it (`oxlint-plugin-<plugin>(<rule>)` before 1.70). */
  rawCode: string;
  severity: string;
  filename: string;
  labels: Array<{ span: { offset: number; length: number; line: number; column: number } }>;
}

export interface OxlintResult {
  exitCode: number;
  diagnostics: Diagnostic[];
  numberOfFiles: number;
  numberOfRules: number;
  durationMs: number;
  stderr: string;
}

/**
 * oxlint >= 1.70 prints JS plugin codes with the normalized name (`query(rule)`);
 * earlier versions printed the package name (`oxlint-plugin-query(rule)`).
 */
export function normalizeCode(code: string): string {
  return code.replace(/^oxlint-plugin-/, "");
}

/** Expected (normalized) diagnostic code for a rule. */
export function ruleCode(plugin: PluginName, rule: string): string {
  return `${plugin}(${rule})`;
}

/** Path of a plugin's bundle in the temp build directory. */
export function bundlePath(name: PluginName): string {
  return join(BUILD_DIR, name, "index.js");
}

const builds = new Map<PluginName, Promise<string>>();

/** Bundle a plugin (once per process) into the temp build directory using Bun.build(). */
export function buildPlugin(name: PluginName): Promise<string> {
  let pending = builds.get(name);
  if (!pending) {
    pending = (async () => {
      const outdir = join(BUILD_DIR, name);
      const result = await Bun.build({
        entrypoints: [entryPoint(name)],
        outdir,
        target: "node",
        format: "esm",
      });
      if (!result.success) {
        throw new Error(`Failed to build ${name}: ${result.logs.join("\n")}`);
      }
      return bundlePath(name);
    })();
    builds.set(name, pending);
  }
  return pending;
}

/** Bundle every plugin in the name map and return their output paths */
export async function buildAllPlugins(): Promise<Record<PluginName, string>> {
  const results = await Promise.all(PLUGIN_NAMES.map(async (name) => [name, await buildPlugin(name)] as const));
  return Object.fromEntries(results) as Record<PluginName, string>;
}

interface OxlintConfig {
  plugins: PluginName[];
  rules: Record<string, string | [string, ...unknown[]]>;
  settings?: Record<string, unknown>;
}

/** Write a temp .oxlintrc.json with jsPlugins pointing to the temp bundles */
export async function writeOxlintConfig(config: OxlintConfig): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "oxlint-cli-test-"));
  const configPath = join(tmpDir, ".oxlintrc.json");

  const oxlintConfig = {
    jsPlugins: config.plugins.map((name) => bundlePath(name)),
    rules: config.rules,
    ...(config.settings ? { settings: config.settings } : {}),
  };

  await Bun.write(configPath, JSON.stringify(oxlintConfig, null, 2));
  return configPath;
}

interface RunOptions {
  configPath: string;
  files: string[];
  /** Extra args to pass to oxlint (e.g. ["--threads", "1"]) */
  extraArgs?: string[];
}

function absolute(f: string): string {
  return f.startsWith("/") ? f : join(ROOT, f);
}

async function spawnOxlint(args: string[]): Promise<OxlintResult> {
  const start = performance.now();
  const proc = Bun.spawn([oxlintBin(), ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const durationMs = performance.now() - start;

  const output = stdout || stderr;
  let parsed: any;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error(`Failed to parse oxlint JSON output (exit ${exitCode}):\n${output}\n${stderr}`);
  }

  const diagnostics: Diagnostic[] = (parsed.diagnostics ?? []).map((d: any) => ({
    ...d,
    rawCode: d.code,
    code: normalizeCode(String(d.code ?? "")),
  }));

  return {
    exitCode,
    diagnostics,
    numberOfFiles: parsed.number_of_files ?? 0,
    numberOfRules: parsed.number_of_rules ?? 0,
    durationMs,
    stderr,
  };
}

/** Spawn oxlint with --format json -A all, parse output, return structured result */
export async function runOxlint(options: RunOptions): Promise<OxlintResult> {
  return spawnOxlint([
    "-c", options.configPath,
    "--format", "json",
    "-A", "all",
    ...(options.extraArgs ?? []),
    ...options.files.map(absolute),
  ]);
}

/** Clean up a temp config directory */
export async function cleanupConfig(configPath: string): Promise<void> {
  const dir = join(configPath, "..");
  await rm(dir, { recursive: true, force: true });
}

/** Resolve a fixture file path relative to tests/cli/fixtures/ */
export function fixture(filename: string): string {
  return join(ROOT, "tests", "cli", "fixtures", filename);
}

/** Resolve a per-rule fixture: tests/cli/fixtures/{plugin}/{rule}.{ext} */
export function ruleFixture(plugin: string, rule: string, ext = "ts"): string {
  return join(ROOT, "tests", "cli", "fixtures", plugin, `${rule}.${ext}`);
}

/** 1-based line numbers of a fixture that carry a `// report` marker comment. */
export async function markedLines(file: string): Promise<number[]> {
  const text = await Bun.file(absolute(file)).text();
  return text
    .split("\n")
    .flatMap((line, i) => (/\/\/ report\b/.test(line) ? [i + 1] : []));
}

/** Sorted 1-based start lines of the given diagnostics. */
export function reportedLines(diags: Diagnostic[]): number[] {
  return diags.map((d) => d.labels[0]?.span.line ?? -1).sort((a, b) => a - b);
}

/** Resolve a bench fixture file path */
export function benchFixture(filename: string): string {
  return join(ROOT, "tests", "bench", "fixtures", filename);
}

export interface OxlintFixResult extends OxlintResult {
  /** Map of filename → fixed file content */
  fixedFiles: Record<string, string>;
}

/** Copy fixtures to a temp dir, run oxlint --fix, return diagnostics + fixed files */
export async function runOxlintWithFix(options: RunOptions): Promise<OxlintFixResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), "oxlint-fix-test-"));
  try {
    const tempFiles: string[] = [];
    for (const f of options.files) {
      const src = absolute(f);
      const dest = join(tmpDir, src.split("/").pop() ?? "file.ts");
      await Bun.write(dest, await Bun.file(src).text());
      tempFiles.push(dest);
    }

    const result = await spawnOxlint([
      "-c", options.configPath,
      "--format", "json",
      "-A", "all",
      "--fix",
      ...(options.extraArgs ?? []),
      ...tempFiles,
    ]);

    const fixedFiles: Record<string, string> = {};
    for (const f of tempFiles) {
      fixedFiles[f.split("/").pop() ?? f] = await Bun.file(f).text();
    }
    return { ...result, fixedFiles };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export { PLUGIN_NAMES, ROOT };
export type { PluginName };
