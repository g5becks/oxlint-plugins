// solidjs/reactivity at settings.solidjs.version 2 (TASK-044). Marked lines are the reported ones.
import { createEffect, createMemo, createSignal, For, isPending, onSettled, Show } from "solid-js";

declare function fetchItems(): Promise<Array<{ tag: string }>>;
declare function log(...args: unknown[]): void;

export function Search(props: { title: string }) {
  const [query] = createSignal("");
  const [id] = createSignal(1);
  const [items] = createSignal<string[]>([]);

  // Split effect: compute tracked, apply receives the value (MIGRATION §Effects).
  createEffect(
    () => id(),
    (value) => {
      log(value, props.title); // report
    },
  );

  // Async memo: a read after the first await isn't tracked (RFC 08 UNTRACKED_READ_AFTER_AWAIT).
  const results = createMemo(async () => {
    const res = await fetchItems();
    return res.filter((item) => item.tag === query()); // report
  });

  const pending = isPending(() => results()); // report

  onSettled(() => {
    log(query());
  });

  return (
    <div>
      <Show when={results()}>{(r) => <span>{r().length}</span>}</Show>
      <For each={items()}>
        {(item) => {
          const q = query(); // report
          return <li>{item + q}</li>;
        }}
      </For>
      <p>{String(pending)}</p>
    </div>
  );
}
