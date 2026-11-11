/**
 * Prepare a release of the packages that have pending changesets.
 *
 *   bun scripts/release-prepare.ts <release> [--dry-run] [--out <dir>] [--skip-ci]
 *
 * <release> names the release branch (`release/<release>`, e.g. 0.2.0) and the output folder.
 *
 * Real run (on branch release/<release>, clean tree):
 *   1. `changeset version` (bumps versions, writes CHANGELOGs, consumes .changeset/*.md),
 *      then `bun install` to update the lockfile and a frozen-install check;
 *   2. `bun run gate` (lint, format, typecheck, build, unit, compat, repo, CLI, bench);
 *   3. commits `chore(release): <release>` and creates LOCAL annotated tags
 *      `<package>@<version>` for every released package;
 *   4. `scripts/ci-local.sh <release commit>` must print RESULT: PASS (log saved);
 *   5. builds and packs each released package into <out>
 *      (default ../oxlint-plugins-release/<release>/), verifies the tarballs with
 *      scripts/pack-smoke.ts on the oxlint floor and the pinned oxlint, and writes
 *      SHA512SUMS, RELEASE_NOTES.md and MAINTAINER_COMMANDS.md;
 *   6. prints the maintainer's commands.
 *
 * --dry-run does the same in a temporary git worktree of HEAD (detached): it writes the
 * tarballs, SHA512SUMS, RELEASE_NOTES.md and MAINTAINER_COMMANDS.md to <out> (default: a
 * new temp dir) but creates no commit on a branch, no tags and does not run ci-local
 * (an unreachable worktree commit can't be cloned). --skip-ci skips ci-local in a real run
 * (never for a real release; the release procedure requires it).
 *
 * It never pushes, never tags remotely and never publishes.
 */
import { $ } from "bun";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { PLUGIN_NAMES, PLUGINS, type PluginName, REPO_ROOT } from "./plugins.ts";

const OXLINT_FLOOR = "1.70.0";

function usage(msg?: string): never {
  if (msg) console.error(`release-prepare: ${msg}`);
  console.error("usage: bun scripts/release-prepare.ts <release> [--dry-run] [--out <dir>] [--skip-ci]");
  process.exit(2);
}

const args = process.argv.slice(2);
const release = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const dryRun = args.includes("--dry-run");
const skipCi = args.includes("--skip-ci");
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : undefined;
if (!release || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(release)) usage("give the release as <major>.<minor>.<patch>");

const step = (msg: string) => console.log(`\n▶ ${msg}`);

async function versions(root: string): Promise<Record<PluginName, string>> {
  const out = {} as Record<PluginName, string>;
  for (const name of PLUGIN_NAMES) {
    out[name] = (await Bun.file(join(root, "packages", name, "package.json")).json()).version;
  }
  return out;
}

/** The `## <version>` section of a changelog (without the heading). */
function changelogSection(changelog: string, version: string): string {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start < 0) return "_No changelog entry._";
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join("\n")
    .trim();
}

// ── 0. Preconditions and working directory ─────────────────────────────────────
const head = (await $`git rev-parse HEAD`.cwd(REPO_ROOT).text()).trim();
let root = REPO_ROOT;
let worktree: string | undefined;

if (dryRun) {
  worktree = join(mkdtempSync(join(tmpdir(), "release-dry-run-")), "wt");
  step(`dry run: worktree of ${head.slice(0, 7)} at ${worktree}`);
  await $`git worktree add --quiet --detach ${worktree} ${head}`.cwd(REPO_ROOT);
  root = worktree;
} else {
  const branch = (await $`git rev-parse --abbrev-ref HEAD`.cwd(REPO_ROOT).text()).trim();
  if (branch !== `release/${release}`) usage(`must run on branch release/${release} (on ${branch})`);
  const dirty = (await $`git status --porcelain`.cwd(REPO_ROOT).text()).trim();
  if (dirty) usage(`working tree is not clean:\n${dirty}`);
}

const out = resolve(
  outArg ??
    (dryRun
      ? mkdtempSync(join(tmpdir(), `release-${release}-`))
      : join(REPO_ROOT, "..", "oxlint-plugins-release", release)),
);
if (existsSync(out) && readdirSync(out).length > 0 && !(dryRun && !outArg))
  usage(`output directory is not empty: ${out}`);
mkdirSync(out, { recursive: true });

try {
  // ── 1. Versions and changelogs ───────────────────────────────────────────────
  const before = await versions(root);
  if (dryRun) await $`bun install --frozen-lockfile`.cwd(root).quiet();
  step("changeset version");
  await $`node_modules/.bin/changeset version`.cwd(root);
  const after = await versions(root);
  const released = PLUGIN_NAMES.filter((n) => before[n] !== after[n]);
  if (released.length === 0) throw new Error("no package versions changed: are there pending changesets?");
  for (const n of released) console.log(`  ${PLUGINS[n].packageName}: ${before[n]} -> ${after[n]}`);

  step("update the lockfile");
  await $`bun install`.cwd(root).quiet();
  await $`bun install --frozen-lockfile`.cwd(root).quiet();
  await $`node_modules/.bin/biome format --write .`.cwd(root).quiet();

  // ── 2. Full gate ─────────────────────────────────────────────────────────────
  step("bun run gate");
  await $`bun run gate`.cwd(root);

  // ── 3. Release commit and local tags ─────────────────────────────────────────
  const tags = released.map((n) => `${PLUGINS[n].packageName}@${after[n]}`);
  step(`commit chore(release): ${release}`);
  await $`git add -A`.cwd(root);
  await $`git commit --quiet -m ${`chore(release): ${release}\n\n${tags.map((t) => `- ${t}`).join("\n")}`}`.cwd(root);
  const commit = (await $`git rev-parse HEAD`.cwd(root).text()).trim();
  if (dryRun) {
    console.log(`  (dry run) would tag: ${tags.join(", ")}`);
  } else {
    for (const t of tags) await $`git tag -a ${t} ${commit} -m ${`${t}\n\nRelease ${release}.`}`.cwd(root);
    console.log(`  local tags: ${tags.join(", ")}`);
  }

  // ── 4. ci-local on the release commit ────────────────────────────────────────
  if (dryRun || skipCi) {
    console.log(`\n▶ ci-local skipped (${dryRun ? "dry run" : "--skip-ci"})`);
  } else {
    step(`scripts/ci-local.sh ${commit.slice(0, 7)}`);
    const ci = await $`bash scripts/ci-local.sh ${commit}`.cwd(root).nothrow();
    const log = ci.stdout.toString() + ci.stderr.toString();
    await Bun.write(join(out, "CI_LOCAL.log"), log);
    process.stdout.write(log);
    if (ci.exitCode !== 0 || !/^RESULT: PASS$/m.test(log)) {
      throw new Error(
        "ci-local did not pass on the release commit; local tags were created, delete them before retrying",
      );
    }
  }

  // ── 5. Pack, verify, checksums, notes ────────────────────────────────────────
  step(`pack into ${out}`);
  await $`bun run build`.cwd(root).quiet();
  for (const n of released) {
    await $`bun pm pack --destination ${out} --quiet`.cwd(join(root, "packages", n)).quiet();
  }
  const tarballs = readdirSync(out)
    .filter((f) => f.endsWith(".tgz"))
    .sort();

  const pinned = (await Bun.file(join(root, "package.json")).json()).devDependencies.oxlint;
  step(`pack-smoke on oxlint ${OXLINT_FLOOR} and ${pinned}`);
  await $`bun scripts/pack-smoke.ts --tarballs ${out} --oxlint ${`${OXLINT_FLOOR},${pinned}`}`.cwd(root);

  const sums = tarballs.map((f) => {
    const hash = createHash("sha512");
    hash.update(readFileSync(join(out, f)));
    return `${hash.digest("hex")}  ${f}`;
  });
  await Bun.write(join(out, "SHA512SUMS"), `${sums.join("\n")}\n`);

  // Migration guide for this major.minor (docs/migration-<x.y>.md), linked at the tag.
  const minor = release.split(".").slice(0, 2).join(".");
  const guidePath = `docs/migration-${minor}.md`;
  const hasGuide = existsSync(join(root, guidePath));
  const guideLink = (tag: string) =>
    `https://github.com/g5becks/oxlint-plugins/blob/${encodeURIComponent(tag)}/${guidePath}`;
  const guideLine = (tag: string) => (hasGuide ? `Migration guide: ${guideLink(tag)}\n\n` : "");

  const notes = [`# Release ${release}`, "", `Release commit: \`${commit}\``, ""];
  if (hasGuide && tags[0]) notes.push(`Migration guide: ${guideLink(tags[0])}`, "");
  for (const n of released) {
    const changelog = await Bun.file(join(root, "packages", n, "CHANGELOG.md")).text();
    notes.push(`## ${PLUGINS[n].packageName}@${after[n]}`, "", changelogSection(changelog, after[n]), "");
  }
  await Bun.write(join(out, "RELEASE_NOTES.md"), notes.join("\n"));
  for (const n of released) {
    const changelog = await Bun.file(join(root, "packages", n, "CHANGELOG.md")).text();
    await Bun.write(
      join(out, `NOTES-${PLUGINS[n].packageName}@${after[n]}.md`),
      `${guideLine(`${PLUGINS[n].packageName}@${after[n]}`)}${changelogSection(changelog, after[n])}\n`,
    );
  }

  // ── 6. Maintainer commands ───────────────────────────────────────────────────
  const tarballFor = (n: PluginName) => tarballs.find((f) => f.startsWith(`${PLUGINS[n].packageName}-${after[n]}`));
  const commands = [
    `cd ${REPO_ROOT} && git push origin ${tags.join(" ")}`,
    `cd ${out}`,
    "sha512sum -c SHA512SUMS   # or: shasum -a 512 -c SHA512SUMS",
    ...released.map((n) => `npm publish ./${tarballFor(n)} --access public`),
    ...released.map(
      (n) =>
        `gh release create ${PLUGINS[n].packageName}@${after[n]} --verify-tag --title ${PLUGINS[n].packageName}@${after[n]} --notes-file ${join(out, `NOTES-${PLUGINS[n].packageName}@${after[n]}.md`)}`,
    ),
  ];
  const doc = [
    `# Maintainer commands for release ${release}`,
    "",
    dryRun ? "**DRY RUN**: no commit on a branch and no tags were created; do not run these." : "",
    "Push the tags only when publishing (a tag push triggers release.yml once Actions works).",
    "",
    "```bash",
    ...commands,
    "```",
    "",
  ].join("\n");
  await Bun.write(join(out, "MAINTAINER_COMMANDS.md"), doc);

  step("done");
  console.log(`release commit: ${commit}${dryRun ? " (dry-run worktree only)" : ""}`);
  console.log(`output: ${out}`);
  for (const s of sums) console.log(`  ${basename(s.split("  ")[1] ?? "")}  sha512 ${s.slice(0, 16)}…`);
  console.log(`\n${doc}`);
} finally {
  if (worktree) {
    await $`git worktree remove --force ${worktree}`.cwd(REPO_ROOT).nothrow().quiet();
  }
}
