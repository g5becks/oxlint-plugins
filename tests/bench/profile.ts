/**
 * Per-plugin and per-rule cost of the six plugins on the real-world corpus (audit P1/U2, TASK-028).
 *
 *   bun run bench:profile                      # 5 runs, all plugins -> tests/bench/results/
 *   bun run bench:profile --out tests/bench/baseline/darwin-arm64.json   # refresh a baseline
 *   bun run bench:profile --runs 9 --plugins solidjs,errorset
 *   bun run bench:profile --quick              # 1 run, no warm-up (smoke test)
 *
 * Each measurement runs real oxlint single-threaded (`--threads 1`) over tests/fixtures/corpus/:
 * one warm-up run (discarded), then `--runs` runs; the median wall time is recorded. The baseline is
 * the same run with no JS plugins, so `deltaMs` is what the plugin or rule adds. On oxlint versions
 * whose `--debug=timings` prints a table (1.93.0 yes, 1.70.0 no; see CONTRIBUTING.md) the median
 * rule-callback time and JS plugin runtime are recorded too; otherwise those fields are null.
 */
import { cpus, platform, arch, release, totalmem } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import { oxlintBin } from "../helpers/oxlint-bin.ts";
import { PLUGIN_NAMES, REPO_ROOT, type PluginName } from "../../scripts/plugins.ts";
import { buildAllPlugins, bundlePath } from "../cli/helpers/cli-runner.ts";

const CORPUS = join(REPO_ROOT, "tests", "fixtures", "corpus");
const PLUGINS = { errorset, immutable, "ts-no-assert": tsNoAssert, query, router, solidjs } as unknown as Record<
  PluginName,
  { rules: Record<string, unknown> }
>;

export interface Timings {
  /** rule name -> callback ms, from `--debug=timings` */
  rules: Record<string, number>;
  jsRuntimeTotalMs: number | null;
}

export interface Measurement {
  medianMs: number;
  deltaMs: number;
  /** median rule-callback ms (sum over the measured rules); null when oxlint prints no timings */
  callbacksMs: number | null;
  runsMs: number[];
}

export interface Profile {
  generatedAt: string;
  machine: { platform: string; arch: string; osRelease: string; cpu: string; cores: number; memoryGiB: number };
  versions: { oxlint: string; bun: string; node: string | null; commit: string; dirty: boolean };
  method: { corpus: string; files: number; threads: 1; warmup: number; runs: number; timingsAvailable: boolean };
  baselineMs: number;
  plugins: Record<string, Measurement & { rules: Record<string, Measurement> }>;
}

/** Parse oxlint's `--debug=timings` table (printed with `-f default` only). */
export function parseTimings(output: string): Timings | null {
  const start = output.indexOf("Rule timings:");
  if (start === -1) return null;
  const rules: Record<string, number> = {};
  for (const line of output.slice(start).split("\n").slice(3)) {
    const m = /^(\S+)\s+([\d.]+)\s+[\d.]+%\s+\d+\s+\S+\s*$/.exec(line);
    if (!m) break;
    rules[m[1] as string] = Number(m[2]);
  }
  const total = /JS plugin runtime:\s*\n\s*Total:\s*([\d.]+)ms/.exec(output);
  return { rules, jsRuntimeTotalMs: total ? Number(total[1]) : null };
}

function median(values: number[]): number {
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

const round = (n: number) => Math.round(n * 100) / 100;

async function output(cmd: string[]): Promise<string | null> {
  try {
    const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", cwd: REPO_ROOT });
    const text = await new Response(p.stdout).text();
    return (await p.exited) === 0 ? text.trim() : null;
  } catch {
    return null;
  }
}

export interface ProfileOptions {
  runs: number;
  warmup: number;
  plugins: PluginName[];
  /** measure each rule on its own too (default true) */
  perRule: boolean;
}

export async function profile(opts: ProfileOptions): Promise<Profile> {
  await buildAllPlugins();
  const dir = await mkdtemp(join(tmpdir(), "oxlint-profile-"));
  const bin = oxlintBin();
  let timingsAvailable = false;

  async function measure(plugins: PluginName[], rules: string[]) {
    const config = join(dir, ".oxlintrc.json");
    await Bun.write(
      config,
      JSON.stringify({
        jsPlugins: plugins.map((p) => bundlePath(p)),
        rules: Object.fromEntries(rules.map((r) => [r, "error"])),
      }),
    );
    const args = [bin, "-c", config, "-A", "all", "--threads", "1", "-f", "default", "--debug=timings", CORPUS];
    const walls: number[] = [];
    const callbacks: number[] = [];
    for (let i = 0; i < opts.warmup + opts.runs; i++) {
      const t0 = performance.now();
      const p = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
      const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
      const code = await p.exited;
      const wall = performance.now() - t0;
      if (code > 1) throw new Error(`oxlint exited ${code} for ${rules.join(", ") || "baseline"}:\n${err || out}`);
      if (i < opts.warmup) continue;
      walls.push(wall);
      const t = parseTimings(out + err);
      if (t && rules.length > 0) {
        timingsAvailable = true;
        callbacks.push(rules.reduce((sum, r) => sum + (t.rules[r] ?? 0), 0));
      }
    }
    return { walls, callbacks };
  }

  try {
    const base = await measure([], []);
    const baselineMs = median(base.walls);
    const toMeasurement = (m: { walls: number[]; callbacks: number[] }): Measurement => ({
      medianMs: round(median(m.walls)),
      deltaMs: round(median(m.walls) - baselineMs),
      callbacksMs: m.callbacks.length ? round(median(m.callbacks)) : null,
      runsMs: m.walls.map(round),
    });

    const result: Profile["plugins"] = {};
    for (const plugin of opts.plugins) {
      const ruleKeys = Object.keys(PLUGINS[plugin].rules)
        .sort()
        .map((r) => `${plugin}/${r}`);
      const all = toMeasurement(await measure([plugin], ruleKeys));
      const rules: Record<string, Measurement> = {};
      if (opts.perRule) {
        for (const key of ruleKeys) rules[key] = toMeasurement(await measure([plugin], [key]));
      }
      result[plugin] = { ...all, rules };
    }

    const commit = (await output(["git", "rev-parse", "--short", "HEAD"])) ?? "unknown";
    const status = await output(["git", "status", "--porcelain"]);
    const cpuList = cpus();
    return {
      generatedAt: new Date().toISOString(),
      machine: {
        platform: platform(),
        arch: arch(),
        osRelease: release(),
        cpu: cpuList[0]?.model ?? "unknown",
        cores: cpuList.length,
        memoryGiB: Math.round(totalmem() / 2 ** 30),
      },
      versions: {
        oxlint: ((await output([bin, "--version"])) ?? "unknown").replace(/^Version:\s*/, ""),
        bun: Bun.version,
        node: (await output(["node", "--version"]))?.replace(/^v/, "") ?? null,
        commit,
        dirty: Boolean(status),
      },
      method: {
        corpus: relative(REPO_ROOT, CORPUS),
        files: [...new Bun.Glob("**/*.{ts,tsx,js,jsx}").scanSync(CORPUS)].length,
        threads: 1,
        warmup: opts.warmup,
        runs: opts.runs,
        timingsAvailable,
      },
      baselineMs: round(baselineMs),
      plugins: result,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function summary(p: Profile): string {
  const lines = [
    `oxlint ${p.versions.oxlint}, ${p.machine.cpu} (${p.machine.platform}/${p.machine.arch}), ` +
      `${p.method.files} files, median of ${p.method.runs} runs; baseline (no JS plugins) ${p.baselineMs} ms`,
    "",
    `${"plugin / rule".padEnd(48)} ${"median ms".padStart(10)} ${"delta ms".padStart(9)} ${"callbacks ms".padStart(12)}`,
  ];
  const row = (name: string, m: Measurement) =>
    `${name.padEnd(48)} ${m.medianMs.toFixed(1).padStart(10)} ${m.deltaMs.toFixed(1).padStart(9)} ${(m.callbacksMs?.toFixed(2) ?? "n/a").padStart(12)}`;
  for (const [plugin, m] of Object.entries(p.plugins)) {
    lines.push(row(plugin, m));
    for (const [rule, r] of Object.entries(m.rules)) lines.push(row(`  ${rule}`, r));
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const quick = argv.includes("--quick");
  const plugins = (flag("--plugins")?.split(",") ?? [...PLUGIN_NAMES]) as PluginName[];
  for (const p of plugins) if (!PLUGIN_NAMES.includes(p)) throw new Error(`unknown plugin: ${p}`);
  const runs = quick ? 1 : Number(flag("--runs") ?? 5);
  if (!quick && !(runs >= 5)) throw new Error("--runs must be at least 5 (use --quick for a smoke run)");
  const result = await profile({ runs, warmup: quick ? 0 : 1, plugins, perRule: true });
  const out =
    flag("--out") ??
    join(REPO_ROOT, "tests", "bench", "results", `profile-${result.machine.platform}-${result.machine.arch}.json`);
  await Bun.write(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(summary(result));
  console.log(`\nwrote ${relative(REPO_ROOT, out)}`);
}
