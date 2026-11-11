// eslint-plugin-solid 0.14.5 cases the port intentionally doesn't match. Each entry has a section
// in PARITY.md (`parity` is its anchor). `match` is the case index in the suite's valid/invalid
// array; `code` (optional) guards against index drift: the entry only applies if the case code
// contains it.
export interface Divergence {
  suite: string;
  kind: "valid" | "invalid" | "suite";
  match: number;
  code?: string;
  parity: string;
}

export const DIVERGENCES: Divergence[] = [
  { suite: "jsx-uses-vars", kind: "suite", match: -1, parity: "solid-jsx-uses-vars-suite" },
];

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
