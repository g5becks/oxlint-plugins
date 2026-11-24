// imports + no-removed-apis together (TASK-048): a store path and renames in one file.
import { createSignal, Suspense, onMount } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

declare function measure(): void;

export function List() {
  const [rows] = createSignal<Array<{ id: string }>>([]);
  const [store, setStore] = createStore({ list: [] as Array<{ id: string }> });
  onMount(() => measure());
  setStore("list", reconcile(rows(), { key: "id" }));
  return (
    <Suspense fallback={<p>loading</p>}>
      <p>{store.list.length}</p>
    </Suspense>
  );
}
