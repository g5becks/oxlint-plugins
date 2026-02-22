import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dir, "..", "..", "..");

const PLUGIN_NAMES = ["router", "query", "functional", "solid"] as const;
type PluginName = (typeof PLUGIN_NAMES)[number];

export interface Diagnostic {
  message: string;
  code: string;
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
}

/** Bundle a single plugin to dist/ using Bun.build() */
export async function buildPlugin(name: PluginName): Promise<string> {
  const entryPoint = join(ROOT, "packages", `plugin-${name}`, "src", "index.ts");
  const outdir = join(ROOT, "dist", `plugin-${name}`);
  const result = await Bun.build({
    entrypoints: [entryPoint],
    outdir,
    target: "node",
    format: "esm",
  });
  if (!result.success) {
    throw new Error(`Failed to build plugin-${name}: ${result.logs.join("\n")}`);
  }
  return join(outdir, "index.js");
}

/** Bundle all 4 plugins and return their output paths */
export async function buildAllPlugins(): Promise<Record<PluginName, string>> {
  const results = await Promise.all(PLUGIN_NAMES.map(async (name) => [name, await buildPlugin(name)] as const));
  return Object.fromEntries(results) as Record<PluginName, string>;
}

interface OxlintConfig {
  plugins: PluginName[];
  rules: Record<string, string | [string, ...unknown[]]>;
}

/** Write a temp .oxlintrc.json with jsPlugins pointing to dist/ bundles */
export async function writeOxlintConfig(config: OxlintConfig): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "oxlint-cli-test-"));
  const configPath = join(tmpDir, ".oxlintrc.json");

  const jsPlugins = config.plugins.map(
    (name) => join(ROOT, "dist", `plugin-${name}`, "index.js"),
  );

  const prefixedRules: Record<string, string | [string, ...unknown[]]> = {};
  for (const [key, value] of Object.entries(config.rules)) {
    prefixedRules[key] = value;
  }

  const oxlintConfig = {
    jsPlugins,
    rules: prefixedRules,
  };

  await Bun.write(configPath, JSON.stringify(oxlintConfig, null, 2));
  return configPath;
}

interface RunOptions {
  configPath: string;
  files: string[];
}

/** Spawn oxlint with --format json -A all, parse output, return structured result */
export async function runOxlint(options: RunOptions): Promise<OxlintResult> {
  const args = [
    "oxlint",
    "-c", options.configPath,
    "--format", "json",
    "-A", "all",
    ...options.files.map((f) => (f.startsWith("/") ? f : join(ROOT, f))),
  ];

  const start = performance.now();
  const proc = Bun.spawn(["bunx", ...args], {
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
    throw new Error(`Failed to parse oxlint JSON output:\n${output}`);
  }

  return {
    exitCode,
    diagnostics: parsed.diagnostics ?? [],
    numberOfFiles: parsed.number_of_files ?? 0,
    numberOfRules: parsed.number_of_rules ?? 0,
    durationMs,
  };
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

/** Resolve a bench fixture file path */
export function benchFixture(filename: string): string {
  return join(ROOT, "tests", "bench", "fixtures", filename);
}

interface RunWithFixOptions extends RunOptions {
  /** Extra args to pass to oxlint (e.g. ["--fix"]) */
  extraArgs?: string[];
}

export interface OxlintFixResult extends OxlintResult {
  /** Map of filename → fixed file content */
  fixedFiles: Record<string, string>;
}

/** Copy fixtures to a temp dir, run oxlint --fix, return diagnostics + fixed files */
export async function runOxlintWithFix(options: RunWithFixOptions): Promise<OxlintFixResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), "oxlint-fix-test-"));

  // Copy fixture files to temp dir
  const tempFiles: string[] = [];
  for (const f of options.files) {
    const src = f.startsWith("/") ? f : join(ROOT, f);
    const basename = src.split("/").pop()!;
    const dest = join(tmpDir, basename);
    const content = await Bun.file(src).text();
    await Bun.write(dest, content);
    tempFiles.push(dest);
  }

  // Run oxlint --fix on temp copies
  const args = [
    "oxlint",
    "-c", options.configPath,
    "--format", "json",
    "-A", "all",
    "--fix",
    ...(options.extraArgs ?? []),
    ...tempFiles,
  ];

  const start = performance.now();
  const proc = Bun.spawn(["bunx", ...args], {
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
    throw new Error(`Failed to parse oxlint JSON output:\n${output}`);
  }

  // Read back the (possibly) fixed files
  const fixedFiles: Record<string, string> = {};
  for (const f of tempFiles) {
    fixedFiles[f.split("/").pop()!] = await Bun.file(f).text();
  }

  // Cleanup temp dir
  await rm(tmpDir, { recursive: true, force: true });

  return {
    exitCode,
    diagnostics: parsed.diagnostics ?? [],
    numberOfFiles: parsed.number_of_files ?? 0,
    numberOfRules: parsed.number_of_rules ?? 0,
    durationMs,
    fixedFiles,
  };
}

export { PLUGIN_NAMES, ROOT };
export type { PluginName };
