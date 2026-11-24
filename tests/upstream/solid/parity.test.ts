// TASK-062: the divergence mechanism for the vendored eslint-plugin-solid suites. An entry without
// `output` skips its case; one with `output` runs the case against that output, with the PARITY.md
// anchor in the test name; an entry that matches no case throws, so a stale entry can't do nothing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type Divergence, applyDivergences } from "./parity.ts";

const cases = [{ code: "a();", output: "b();" }, { code: "c();", output: "d();" }, "e();"];

describe("applyDivergences", () => {
  it("leaves cases without an entry alone", () => {
    assert.deepEqual(applyDivergences("s", "invalid", cases, []), { kept: cases, skipped: [] });
  });

  it("skips a case matched by an entry without output", () => {
    const d: Divergence[] = [{ suite: "s", kind: "invalid", match: 0, code: "a()", parity: "p" }];
    const { kept, skipped } = applyDivergences("s", "invalid", cases, d);
    assert.deepEqual(kept, [cases[1], cases[2]]);
    assert.deepEqual(skipped, [{ index: 0, reason: "intentional divergence, see PARITY.md#p" }]);
  });

  it("runs a case matched by an output override against the override, naming the anchor", () => {
    const d: Divergence[] = [{ suite: "s", kind: "invalid", match: 1, code: "c()", parity: "p", output: "z();" }];
    const { kept, skipped } = applyDivergences("s", "invalid", cases, d);
    assert.deepEqual(skipped, []);
    assert.deepEqual(kept[1], { code: "c();", output: "z();", name: "c(); [intentional divergence, see PARITY.md#p]" });
    assert.equal(kept[0], cases[0]);
  });

  it("applies only when the code guard matches", () => {
    const d: Divergence[] = [{ suite: "s", kind: "invalid", match: 1, code: "not-there", parity: "p", output: "z();" }];
    assert.throws(() => applyDivergences("s", "invalid", cases, d), /stale divergence.*invalid\[1\].*PARITY\.md#p/);
  });

  it("throws on an entry whose index is out of range", () => {
    const d: Divergence[] = [{ suite: "s", kind: "valid", match: 9, parity: "p" }];
    assert.throws(() => applyDivergences("s", "valid", cases, d), /stale divergence.*valid\[9\]/);
  });

  it("ignores other suites and kinds", () => {
    const d: Divergence[] = [
      { suite: "other", kind: "invalid", match: 0, parity: "p" },
      { suite: "s", kind: "valid", match: 0, parity: "p" },
    ];
    assert.deepEqual(applyDivergences("s", "invalid", cases, d).kept, cases);
  });
});
