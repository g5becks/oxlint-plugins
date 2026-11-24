// solidjs/no-write-in-reactive-scope at settings.solidjs.version 2 (TASK-047). Marked lines are the reported ones.
import { createEffect, createMemo, createSignal, onSettled, untrack } from "solid-js";

declare function load(): Promise<string>;

export function Settings(props: { saved?: string }) {
  const [draft, setDraft] = createSignal("");
  const [count, setCount] = createSignal(0);
  const [doubled, setDoubled] = createSignal(0);
  const [, setInternal] = createSignal(0, { ownedWrite: true });

  // Copying a prop into state in the component body (MIGRATION: seed with createSignal(() => ...)).
  setDraft(props.saved ?? ""); // report
  untrack(() => setCount(1)); // report
  setInternal(1);

  createMemo(() => setDoubled(count() * 2)); // report

  createEffect(
    () => count(),
    (value) => {
      setDoubled(value * 2);
    },
  );

  onSettled(() => {
    void load().then(setDraft);
    setCount(0);
  });

  return (
    <input value={draft()} onInput={(e) => setDraft(e.currentTarget.value)} data-d={doubled()} />
  );
}
