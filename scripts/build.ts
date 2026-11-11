/**
 * Build every plugin bundle (or the ones named on the command line) with
 * `bun build <entry> --outdir <pkg>/dist --target node --format esm`.
 *
 *   bun scripts/build.ts              # all six
 *   bun scripts/build.ts solidjs      # one
 */
import { $ } from "bun";
import { join } from "node:path";
import { PLUGIN_NAMES, type PluginName, entryPoint, packageDir } from "./plugins.ts";

const requested = process.argv.slice(2);
for (const name of requested) {
  if (!(PLUGIN_NAMES as readonly string[]).includes(name)) {
    console.error(`Unknown plugin "${name}". Known: ${PLUGIN_NAMES.join(", ")}`);
    process.exit(1);
  }
}
const targets = (requested.length > 0 ? requested : PLUGIN_NAMES) as readonly PluginName[];

for (const name of targets) {
  const outdir = join(packageDir(name), "dist");
  await $`bun build ${entryPoint(name)} --outdir ${outdir} --target node --format esm`;
}
