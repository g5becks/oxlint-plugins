// solidjs/effect-split at settings.solidjs.version 2 (TASK-046). Marked lines are the reported ones.
import { createEffect, createMemo, createSignal, createTrackedEffect, onCleanup, onSettled } from "solid-js";

declare function log(...args: unknown[]): void;
declare const el: HTMLElement;

export function Clock() {
  const [name] = createSignal("");
  const [count] = createSignal(0);

  // 1.x single-function effect with onCleanup (MIGRATION §Effects, lifecycle, and cleanup).
  createEffect(() => { // report
    const id = setInterval(() => log(name()), 1000);
    onCleanup(() => clearInterval(id)); // report
  });

  // 1.x initial values.
  createEffect((prev: number) => count() + prev, 0); // report
  const doubled = createMemo((prev: number) => count() * 2 + prev, 0); // report

  // 2.0 split effect: the cleanup is returned.
  createEffect(
    () => name(),
    (value) => {
      const id = setInterval(() => log(value), 1000);
      return () => clearInterval(id);
    },
  );

  // An apply that returns its assignment's value (RFC 08 §Invalid cleanup return value).
  createEffect(
    () => name(),
    (value) => (el.title = value), // report
  );

  createTrackedEffect(() => {
    onCleanup(() => log("x")); // report
  });

  onSettled(() => {
    const [local] = createSignal(0); // report
    log(local(), doubled());
  });

  return <p>{doubled()}</p>;
}
