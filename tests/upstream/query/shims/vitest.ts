// Minimal vitest stand-in on node:test for the vendored suites (describe/test/it/afterAll/expect).
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

type Fn = (...args: unknown[]) => unknown;
type Body = () => void | Promise<void>;

/** vitest-style `test.each(cases)(title, fn)`; `%s`/`%j` in the title use the case. */
function each(register: (name: string, fn: Body) => unknown) {
  return (cases: readonly unknown[]) => (title: string, fn: Fn) => {
    cases.forEach((c, i) => {
      const args = Array.isArray(c) ? c : [c];
      let k = 0;
      const name =
        title.replace(/%[sjdio#]/g, (m) => (m === "%#" ? String(i) : JSON.stringify(args[k++]))) || `${title} ${i}`;
      register(`${name} [${i}]`, () => {
        fn(...args);
      });
    });
  };
}

const testFn = Object.assign((name: string, fn: Body) => it(name, fn), {
  each: each((name, fn) => it(name, fn)),
});
const describeFn = Object.assign((name: string, fn: () => void) => describe(name, fn), {
  each: each((name, fn) =>
    describe(name, () => {
      void fn();
    }),
  ),
});

export { describeFn as describe, testFn as it, testFn as test };
export const afterAll = after;
export function expect(actual: unknown) {
  return {
    toEqual: (expected: unknown) => assert.deepStrictEqual(actual, expected),
    toBe: (expected: unknown) => assert.strictEqual(actual, expected),
  };
}
