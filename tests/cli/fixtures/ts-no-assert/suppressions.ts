// Audit U1: oxlint >= 1.70 normalizes `oxlint-plugin-<name>` to `<name>`.
// Only the short-form directive suppresses; the long form is ignored.
export const a = 1 as number; // report (no directive)
// oxlint-disable-next-line oxlint-plugin-ts-no-assert/no-type-assertion
export const b = 2 as number; // report (long form is not honored on >= 1.70)
// oxlint-disable-next-line ts-no-assert/no-type-assertion
export const c = 3 as number;
