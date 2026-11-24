import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

// TASK-047 follow-up: no-write-in-reactive-scope reports writes in a compute, a memo, a derive
// function and an owner (component) body, and allows them in an effect's apply function and onSettled.
// This checks that line against the runtime: the development build of @solidjs/signals 2.0.3 (the
// build that raises REACTIVE_WRITE_IN_OWNED_SCOPE), loaded by path because the package's exports
// only serve it under the "development" condition.
const DEV = join(import.meta.dirname, "..", "..", "..", "node_modules", "@solidjs", "signals", "dist", "dev.js");
const S = await import(pathToFileURL(DEV).href);
const { createRoot, createSignal, createMemo, createEffect, flush, untrack, onSettled, resetErrorHalt } = S;

const CODE = "REACTIVE_WRITE_IN_OWNED_SCOPE";

/** Run `body` in a root's owned scope (like a component body), then flush effects outside it, as an
 * app does on a microtask. Returns the owned-write errors that were thrown or reported. */
function ownedWriteErrors(body: () => void): string[] {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map(String).join(" ");
    if (text.includes(CODE)) errors.push(text);
  };
  try {
    const dispose = createRoot((d: () => void) => {
      body();
      return d;
    });
    flush();
    dispose();
  } catch (e) {
    if (String((e as Error)?.message ?? e).includes(CODE)) errors.push(String((e as Error).message));
    else throw e;
  } finally {
    console.error = original;
    // An uncaught error halts the reactive system for the process; reset it for the next case.
    resetErrorHalt();
  }
  return errors;
}

describe("Solid 2.0 runtime: where a write throws REACTIVE_WRITE_IN_OWNED_SCOPE", () => {
  it("a write in an effect's compute function is an error", () => {
    const errors = ownedWriteErrors(() => {
      const [a] = createSignal(0);
      const [, setB] = createSignal(0);
      createEffect(
        () => {
          setB(1);
          return a();
        },
        () => {},
      );
    });
    assert.equal(errors.length > 0, true);
  });

  it("the same write in the effect's apply function is not, and it lands", () => {
    const seen: number[] = [];
    const errors = ownedWriteErrors(() => {
      const [a] = createSignal(0);
      const [b, setB] = createSignal(0);
      createEffect(
        () => a(),
        (v: number) => {
          setB(v + 1);
        },
      );
      createEffect(
        () => b(),
        (v: number) => {
          seen.push(v);
        },
      );
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(seen, [0, 1]);
  });

  it("writes in a memo, a derived signal, an owner body and untrack() inside it are errors", () => {
    const cases: Array<[string, () => void]> = [
      [
        "memo",
        () => {
          const [a] = createSignal(0);
          const [, setB] = createSignal(0);
          createMemo(() => {
            setB(a());
            return a();
          })();
        },
      ],
      [
        "createSignal(fn)",
        () => {
          const [a] = createSignal(0);
          const [, setB] = createSignal(0);
          createSignal(() => {
            setB(1);
            return a();
          })[0]();
        },
      ],
      [
        "owner body",
        () => {
          const [, setB] = createSignal(0);
          setB(1);
        },
      ],
      [
        "untrack in owner body",
        () => {
          const [, setB] = createSignal(0);
          untrack(() => setB(1));
        },
      ],
    ];
    for (const [label, body] of cases) {
      assert.equal(ownedWriteErrors(body).length > 0, true, label);
    }
  });

  it("onSettled and { ownedWrite: true } are allowed", () => {
    assert.deepEqual(
      ownedWriteErrors(() => {
        const [, setB] = createSignal(0);
        onSettled(() => {
          setB(1);
        });
      }),
      [],
    );
    assert.deepEqual(
      ownedWriteErrors(() => {
        const [, setB] = createSignal(0, { ownedWrite: true });
        setB(1);
      }),
      [],
    );
  });
});
