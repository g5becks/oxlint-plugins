/**
 * commit-msg hook: enforce Conventional Commits.
 *
 *   <type>(<scope>)!: <summary>
 *
 * Usage: bun scripts/check-commit-msg.ts <path-to-commit-msg-file>
 * Also exports `checkCommitMessage` for tests.
 */
export const TYPES = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
] as const;

const HEADER = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9][a-z0-9._/-]*\\))?!?: \\S.*$`);

/** Returns an error message, or null when the message is acceptable. */
export function checkCommitMessage(message: string): string | null {
  const lines = message.split("\n").filter((line) => !line.startsWith("#"));
  const header = (lines[0] ?? "").trimEnd();
  // Messages git generates itself.
  if (/^(Merge|Revert ") /.test(header) || /^(fixup|squash|amend)! /.test(header)) return null;
  if (header.length === 0) return "empty commit message";
  if (!HEADER.test(header)) {
    return `header must match "<type>(<scope>)!: <summary>" with type one of ${TYPES.join(", ")}; got: ${header}`;
  }
  if (header.length > 100) return `header is ${header.length} characters; keep it at 100 or fewer`;
  if (lines.length > 1 && (lines[1] ?? "").trim() !== "") return "leave a blank line between the header and the body";
  return null;
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: bun scripts/check-commit-msg.ts <commit-msg-file>");
    process.exit(2);
  }
  const error = checkCommitMessage(await Bun.file(file).text());
  if (error) {
    console.error(`commit-msg: ${error}`);
    console.error("See https://www.conventionalcommits.org/ (example: fix(errorset): scope narrowing (TASK-013))");
    process.exit(1);
  }
}
