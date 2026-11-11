// Upstream cases the ports intentionally don't match. Every entry must have a section in
// PARITY.md; the reason string is shown as the skip reason.
export interface Divergence {
  suite: string;
  kind: "valid" | "invalid" | "suite";
  /** Case name (preferred) or index into the suite's valid/invalid array. */
  match: string | number;
  parity: string;
}

export const DIVERGENCES: Divergence[] = [
  { suite: "no-void-query-fn", kind: "suite", match: -1, parity: "query-no-void-query-fn" },
  // No React import in these cases: the port suggests `React.useState` instead of autofixing.
  ...[
    "QueryClient is not stable when it is not wrapped in React.useState in component",
    "QueryClient is not stable when it is not wrapped in React.useState in custom hook",
    "preserve QueryClient options",
    "preserve QueryClient variable declarator name",
  ].map((match) => ({
    suite: "stable-query-client",
    kind: "invalid" as const,
    match,
    parity: "query-stable-query-client-no-react-import",
  })),
];

export function skipReason(
  suite: string,
  kind: "valid" | "invalid" | "suite",
  index: number,
  name: string | undefined,
  _code: string,
): string | undefined {
  const d = DIVERGENCES.find(
    (x) => x.suite === suite && x.kind === kind && (x.match === index || (name !== undefined && x.match === name)),
  );
  return d ? `intentional divergence, see PARITY.md#${d.parity}` : undefined;
}
