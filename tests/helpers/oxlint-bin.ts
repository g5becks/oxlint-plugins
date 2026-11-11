import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

/** Repository root (this file lives in tests/helpers/). */
export const REPO_ROOT = resolve(import.meta.dirname, "..", "..");

/**
 * Path of the oxlint binary used by every real-oxlint test and script.
 *
 * Defaults to the exactly pinned devDependency (`node_modules/.bin/oxlint`).
 * Set `OXLINT_BIN` to run against another version (the CI version matrix
 * uses this for the 1.70.0 floor and for `oxlint@latest`). Never `bunx oxlint`:
 * that resolves whatever is newest on npm at run time.
 */
export function oxlintBin(): string {
  const override = process.env.OXLINT_BIN;
  const bin = override
    ? isAbsolute(override)
      ? override
      : resolve(process.cwd(), override)
    : join(REPO_ROOT, "node_modules", ".bin", "oxlint");
  if (!existsSync(bin)) {
    throw new Error(
      override
        ? `OXLINT_BIN points to a missing file: ${bin}`
        : `oxlint not found at ${bin}; run \`bun install --frozen-lockfile\``,
    );
  }
  return bin;
}
