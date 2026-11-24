// effect-split autofix (TASK-046): expression-bodied callbacks whose value can't be a cleanup.
import { createEffect, createSignal, onSettled } from "solid-js";

declare const el: HTMLElement;
let total = 0;

export function Title() {
  const [name] = createSignal("");
  const [n] = createSignal(0);
  createEffect(
    () => name(),
    (value) => (el.title = value),
  );
  createEffect(n, (v) => (total += v));
  onSettled(() => ({ ready: true }));
  return <p>{name()}</p>;
}
