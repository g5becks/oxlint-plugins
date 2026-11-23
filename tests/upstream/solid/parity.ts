// eslint-plugin-solid 0.14.5 cases the port intentionally doesn't match. Each entry has a section
// in PARITY.md (`parity` is its anchor). `match` is the case index in the suite's valid/invalid
// array; `code` (optional) guards against index drift: the entry only applies if the case code
// contains it. Without `output` the case is skipped; with `output` it still runs, against that
// expected output (TASK-062). An entry that matches no case throws (applyDivergences).
export interface Divergence {
  suite: string;
  kind: "valid" | "invalid" | "suite";
  match: number;
  code?: string;
  parity: string;
  /** The port's expected output for an invalid case: the case runs against it instead of skipping. */
  output?: string;
}

export const DIVERGENCES: Divergence[] = [
  { suite: "jsx-uses-vars", kind: "suite", match: -1, parity: "solid-jsx-uses-vars-suite" },
  // The port's fix also adds the missing `import { Show } / { Switch, Match } from "solid-js"`.
  {
    suite: "components-return-once",
    kind: "invalid",
    match: 5,
    code: "No, really big!",
    parity: "solid-components-return-once-imports",
  },
  {
    suite: "components-return-once",
    kind: "invalid",
    match: 6,
    code: "props.cond1",
    parity: "solid-components-return-once-imports",
  },
  {
    suite: "components-return-once",
    kind: "invalid",
    match: 7,
    code: "!!props.cond &&",
    parity: "solid-components-return-once-imports",
  },
  // The port keeps the `type` modifier when merging a type-only import into a value import.
  {
    suite: "imports",
    kind: "invalid",
    match: 2,
    code: 'import type { Component } from "solid-js/store";',
    parity: "solid-imports-type-modifier",
    output: `\nimport { createSignal, type Component } from "solid-js";\nconsole.log('hi');`,
  },
];

interface Case {
  code: string;
  [key: string]: unknown;
}

const reasonFor = (d: Divergence) => `intentional divergence, see PARITY.md#${d.parity}`;

/**
 * Apply the divergences of one suite's valid or invalid cases: skip matched cases without an
 * `output`, run matched cases with one against it (the test name carries the PARITY.md anchor), and
 * throw for an entry that matched no case, so a stale index or code guard fails loudly.
 */
export function applyDivergences<T extends Case | string>(
  suite: string,
  kind: "valid" | "invalid",
  cases: T[],
  divergences: Divergence[] = DIVERGENCES,
): { kept: T[]; skipped: Array<{ index: number; reason: string }> } {
  const entries = divergences.filter((d) => d.suite === suite && d.kind === kind);
  const used = new Set<Divergence>();
  const kept: T[] = [];
  const skipped: Array<{ index: number; reason: string }> = [];
  cases.forEach((c, index) => {
    const code = typeof c === "string" ? c : c.code;
    const d = entries.find((x) => x.match === index && (x.code === undefined || code.includes(x.code)));
    if (!d) return kept.push(c);
    used.add(d);
    if (d.output === undefined) return skipped.push({ index, reason: reasonFor(d) });
    const base: Case = typeof c === "string" ? { code: c } : c;
    kept.push({ ...base, output: d.output, name: `${code} [${reasonFor(d)}]` } as unknown as T);
  });
  for (const d of entries) {
    if (!used.has(d)) {
      throw new Error(`stale divergence in parity.ts: ${suite} ${kind}[${d.match}] matches no case (${reasonFor(d)})`);
    }
  }
  return { kept, skipped };
}

export function skipReason(
  suite: string,
  kind: "valid" | "invalid" | "suite",
  index: number,
  code: string,
): string | undefined {
  const d = DIVERGENCES.find(
    (x) => x.suite === suite && x.kind === kind && x.match === index && (x.code === undefined || code.includes(x.code)),
  );
  return d ? `intentional divergence, see PARITY.md#${d.parity}` : undefined;
}
