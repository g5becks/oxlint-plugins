import { expect, test } from "bun:test";
import { join } from "node:path";
import { copyrightLines, NOTICES_FILE, render, UPSTREAMS } from "../../scripts/third-party-notices.ts";
import { packageDir, PLUGIN_NAMES, type PluginName } from "../../scripts/plugins.ts";

// TASK-036: committed notices match the upstream license files, and every ported package ships one.
test("THIRD_PARTY_NOTICES.md files are up to date (bun scripts/third-party-notices.ts)", async () => {
  for (const plugin of Object.keys(UPSTREAMS) as PluginName[]) {
    const actual = await Bun.file(join(packageDir(plugin), NOTICES_FILE)).text();
    expect(actual).toBe((await render(plugin)) as string);
    for (const line of await copyrightLines(plugin)) expect(actual).toContain(line);
    const pkg = await Bun.file(join(packageDir(plugin), "package.json")).json();
    expect(pkg.files).toContain(NOTICES_FILE);
  }
});

test("only errorset (original rules) has no upstream", () => {
  expect(PLUGIN_NAMES.filter((p) => !UPSTREAMS[p])).toEqual(["errorset"]);
});
