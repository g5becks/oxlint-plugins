import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import errorset from "../../packages/errorset/src/index.ts";
import { oxlintBin } from "../helpers/oxlint-bin.ts";
import { buildPlugin, bundlePath, fixture } from "./helpers/cli-runner";

// TASK-032 (audit R6): in real oxlint, all errorset rules share one import tracker per file.
// oxlint-plugin-errorset publishes tracker stats on globalThis when OXLINT_PLUGIN_ERRORSET_STATS=1;
// a probe plugin in the same JS runtime reports them. One file, one thread: the totals are the file's.
const RULES = Object.keys((errorset as { rules: Record<string, unknown> }).rules);
let dir: string;
beforeAll(async () => {
  await buildPlugin("errorset");
  dir = await mkdtemp(join(tmpdir(), "oxlint-tracker-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("errorset: one shared import tracker per file (oxlint)", () => {
  test(`all ${RULES.length} rules: one tracker, each declaration processed once`, async () => {
    const config = join(dir, ".oxlintrc.json");
    await Bun.write(
      config,
      JSON.stringify({
        jsPlugins: [bundlePath("errorset"), fixture("tracker-probe/plugin.mjs")],
        rules: {
          ...Object.fromEntries(RULES.map((r) => [`errorset/${r}`, "error"])),
          "tracker-probe/stats": "error",
        },
      }),
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
        fixture("tracker-probe/uses-errorset.ts"),
      ],
      { stdout: "pipe", stderr: "pipe", env: { ...process.env, OXLINT_PLUGIN_ERRORSET_STATS: "1" } },
    );
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const diagnostics: Array<{ code: string; message: string }> = JSON.parse(out).diagnostics;
    expect(diagnostics.some((d) => d.code.includes("errorset("))).toBe(true); // the rules ran
    const probe = diagnostics.find((d) => d.code.includes("tracker-probe("));
    // 2 imports + 3 variable declarations (const UserError, let counter, const data).
    expect(JSON.parse(probe?.message ?? "null")).toEqual({ trackersCreated: 1, nodesProcessed: 5 });
  });
});
