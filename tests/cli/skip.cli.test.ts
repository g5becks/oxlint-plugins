import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { oxlintBin } from "../helpers/oxlint-bin.ts";
import { fixture } from "./helpers/cli-runner";

// TASK-031 (audit P3): the per-file early exits rely on oxlint skipping a rule's visitor for a file
// when its before() hook returns false (lint.js: `if (beforeHook() === false) continue`, present
// in 1.70.0 and 1.93.0). This pins that contract on every oxlint in the CLI matrix.
let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oxlint-skip-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("before() returning false skips the rule for that file", () => {
  test("only the non-skipped file is reported", async () => {
    const config = join(dir, ".oxlintrc.json");
    await Bun.write(
      config,
      JSON.stringify({ jsPlugins: [fixture("skip-probe/plugin.mjs")], rules: { "skip/always": "error" } }),
    );
    const proc = Bun.spawn(
      [
        oxlintBin(),
        "-c",
        config,
        "-A",
        "all",
        "--threads",
        "1",
        "--format",
        "json",
        fixture("skip-probe/visited.ts"),
        fixture("skip-probe/skipped.ts"),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const files = JSON.parse(out).diagnostics.map((d: { filename: string }) => basename(d.filename));
    expect(files).toEqual(["visited.ts"]);
  });
});
