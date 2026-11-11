/**
 * State-isolation harness: lint a sequence of files with ONE rule instance in ONE process.
 *
 * Why the CLI and not RuleTester: oxlint's RuleTester calls `createOnce` once per test case
 * (verified on 1.93.0: two cases -> two `createOnce` calls), so closure state can never leak
 * between cases there. Bugs like audit R9 (jsx-no-undef) and R10 (reactivity) only show up
 * when oxlint reuses a rule's `createOnce` closure across files, as it does per worker thread.
 * `--threads 1` puts every file on the same worker, in argument order.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Diagnostic, runOxlint } from "./cli-runner.ts";

export interface SequenceFile {
  /** File name, including the extension (`a.tsx`). Files are linted in array order. */
  name: string;
  code: string;
}

export interface SequenceResult {
  /** Diagnostics per file name, in input order (empty arrays for clean files). */
  byFile: Map<string, Diagnostic[]>;
  exitCode: number;
  stderr: string;
}

/** Lint `files` in order, in one oxlint process on one thread, with the given config. */
export async function lintSequence(configPath: string, files: SequenceFile[]): Promise<SequenceResult> {
  const dir = await mkdtemp(join(tmpdir(), "oxlint-state-isolation-"));
  try {
    const paths: string[] = [];
    for (const f of files) {
      const p = join(dir, f.name);
      await Bun.write(p, f.code);
      paths.push(p);
    }
    const result = await runOxlint({ configPath, files: paths, extraArgs: ["--threads", "1"] });
    const byFile = new Map<string, Diagnostic[]>(files.map((f) => [f.name, []]));
    for (const d of result.diagnostics) {
      const name = d.filename.split("/").pop() ?? d.filename;
      byFile.get(name)?.push(d);
    }
    return { byFile, exitCode: result.exitCode, stderr: result.stderr };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Names of the files that got at least one diagnostic. */
export function reportedFiles(result: SequenceResult): string[] {
  return [...result.byFile].filter(([, d]) => d.length > 0).map(([name]) => name);
}
