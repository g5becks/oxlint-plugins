/**
 * THIRD_PARTY_NOTICES.md for every package that ports upstream code (TASK-036). MIT requires the
 * upstream copyright and permission notice in copies and substantial portions; each notice file
 * is generated from the upstream LICENSE files and ships in the package tarball.
 *
 *   bun scripts/third-party-notices.ts          # write the files
 *   bun scripts/third-party-notices.ts --check  # exit 1 if a committed file is out of date
 */
import { join } from "node:path";
import { packageDir, type PluginName, REPO_ROOT } from "./plugins.ts";

interface Upstream {
  name: string;
  /** What this package ports from it. */
  ported: string;
  repository: string;
  /** Upstream LICENSE file, relative to the repo root. */
  license: string;
}

export const UPSTREAMS: Partial<Record<PluginName, Upstream[]>> = {
  immutable: [
    {
      name: "eslint-plugin-functional",
      ported: "rules ported from version 10.0.1",
      repository: "https://github.com/eslint-functional/eslint-plugin-functional",
      license: "node_modules/eslint-plugin-functional/LICENSE",
    },
  ],
  "ts-no-assert": [
    {
      name: "eslint-plugin-no-type-assertion",
      ported: "the no-type-assertion rule (license from version 1.3.0)",
      repository: "https://github.com/Dremora/eslint-plugin-no-type-assertion",
      license: "vendor/licenses/eslint-plugin-no-type-assertion@1.3.0/LICENSE",
    },
  ],
  query: [
    {
      name: "@tanstack/eslint-plugin-query",
      ported: "rules ported from version 5.91.4",
      repository: "https://github.com/TanStack/query",
      license: "vendor/@tanstack/eslint-plugin-query@5.91.4/LICENSE",
    },
  ],
  router: [
    {
      name: "@tanstack/eslint-plugin-router",
      ported: "the create-route-property-order rule (license from version 1.162.0)",
      repository: "https://github.com/TanStack/router",
      license: "node_modules/@tanstack/eslint-plugin-router/LICENSE",
    },
  ],
  solidjs: [
    {
      name: "eslint-plugin-solid",
      ported: "rules ported from version 0.14.5",
      repository: "https://github.com/solidjs-community/eslint-plugin-solid",
      license: "vendor/eslint-plugin-solid@0.14.5/LICENSE",
    },
  ],
};

export const NOTICES_FILE = "THIRD_PARTY_NOTICES.md";

/** The first `Copyright ...` line of each upstream license (pack-smoke checks these). */
export async function copyrightLines(plugin: PluginName): Promise<string[]> {
  const lines: string[] = [];
  for (const u of UPSTREAMS[plugin] ?? []) {
    const text = await Bun.file(join(REPO_ROOT, u.license)).text();
    const line = text.split("\n").find((l) => /^\s*Copyright/i.test(l));
    if (!line) throw new Error(`no Copyright line in ${u.license}`);
    lines.push(line.trim());
  }
  return lines;
}

export async function render(plugin: PluginName): Promise<string | null> {
  const upstreams = UPSTREAMS[plugin];
  if (!upstreams?.length) return null;
  const parts = [
    "# Third-party notices\n",
    "This package contains code ported from the following projects, used under their licenses.\n",
  ];
  for (const u of upstreams) {
    const text = (await Bun.file(join(REPO_ROOT, u.license)).text()).trim();
    parts.push(`## ${u.name}\n\n${u.repository}: ${u.ported}.\n\n\`\`\`text\n${text}\n\`\`\`\n`);
  }
  return parts.join("\n");
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  let stale = false;
  for (const plugin of Object.keys(UPSTREAMS) as PluginName[]) {
    const expected = await render(plugin);
    if (expected === null) continue;
    const path = join(packageDir(plugin), NOTICES_FILE);
    const file = Bun.file(path);
    const actual = (await file.exists()) ? await file.text() : null;
    if (check) {
      if (actual !== expected) {
        console.error(`out of date: ${path} (run bun scripts/third-party-notices.ts)`);
        stale = true;
      }
    } else {
      await Bun.write(path, expected);
      console.log(`wrote ${path}`);
    }
  }
  if (stale) process.exit(1);
}
