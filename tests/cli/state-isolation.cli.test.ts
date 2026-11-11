import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "./helpers/cli-runner.ts";
import { lintSequence, reportedFiles } from "./helpers/state-isolation.ts";

// Self-test of the harness with a deliberately leaky rule: proves that files really
// share one createOnce closure (one process, one thread, argument order).
describe("state-isolation harness", () => {
  let dir: string;
  let configPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "oxlint-harness-"));
    configPath = join(dir, ".oxlintrc.json");
    await Bun.write(
      configPath,
      JSON.stringify({ jsPlugins: [fixture("harness/leaky-plugin.mjs")], rules: { "harness/leaky": "error" } }),
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("detects closure state leaking into later files", async () => {
    const result = await lintSequence(configPath, [
      { name: "clean-first.ts", code: "export const ok = 1;\n" },
      { name: "leak.ts", code: "export const LEAK = 1;\n" },
      { name: "clean-after-1.ts", code: "export const ok = 2;\n" },
      { name: "clean-after-2.ts", code: "export const ok = 3;\n" },
    ]);
    expect(result.stderr).not.toContain("Error running JS plugin");
    expect(reportedFiles(result)).toEqual(["leak.ts", "clean-after-1.ts", "clean-after-2.ts"]);
  });
});
