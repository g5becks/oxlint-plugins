// Vendored TanStack suites that don't run at all (listed in PARITY.md). They are excluded from
// the `test:upstream` file list and reported here as skipped tests.
import { it } from "node:test";
import { DIVERGENCES, skipReason } from "./parity.ts";

for (const d of DIVERGENCES.filter((x) => x.kind === "suite")) {
  it(`${d.suite} (whole suite)`, { skip: skipReason(d.suite, "suite", -1, undefined, "") }, () => {});
}
