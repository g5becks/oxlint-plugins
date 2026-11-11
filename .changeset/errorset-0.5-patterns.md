---
"oxlint-plugin-errorset": minor
---

Support `@takinprofit/errorset` 0.4 and 0.5 patterns (0.3 patterns keep working):

- `throw X.kind`msg`.with({ cause })` is reported by `no-throw-errorset`.
- Object-form sets (`errorSet("X", { kind: ["key"] })`) are recognized.
- Merged guards (`merge(A, B)`, `A.merge(B)`) are set-level guards: they narrow, are checked in `catch`, and never get a kind-guard suggestion.
- `err.set === "X"` narrows to set `X`; `prefer-guard-over-manual-kind-check` then suggests `X.<kind>(err)`.
- Set members (`recover`, `inspect`, `merge`, `capture`, `captureAsync`, `from`, `kinds`) are no longer mistaken for kind guards (for example `X.from(body)` no longer marks `body` as an error).
- Throwing inside top-level `captureSync`/`captureAsync` targets is not reported; `throw toError(err)` is not reported.
- `no-new-error-in-errorset-fn` also reports `return new Error(...)` (audit R6), which may surface new warnings.
