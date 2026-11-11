import { describe, expect, test } from "bun:test";
import { checkCommitMessage } from "../../scripts/check-commit-msg.ts";

describe("commit-msg check", () => {
  test.each([
    "feat(errorset): settings-driven detection (TASK-012)",
    "fix!: drop pre-1.70 fallbacks",
    "chore(release): 0.2.0",
    "test(cli): cover all six plugins (TASK-004)\n\nBody text.\n",
    "Merge pull request #1 from g5becks/release/0.2.0",
    "style(repo): one-time reformat\n# comment lines are ignored",
  ])("accepts %p", (msg) => {
    expect(checkCommitMessage(msg)).toBeNull();
  });

  test.each([
    "",
    "update stuff",
    "Feat: capitalized type",
    "feature(x): unknown type",
    "fix(Scope): uppercase scope",
    "fix:missing space",
    "fix(x): header\nbody without blank line",
    `fix: ${"x".repeat(100)}`,
  ])("rejects %p", (msg) => {
    expect(checkCommitMessage(msg)).not.toBeNull();
  });
});
