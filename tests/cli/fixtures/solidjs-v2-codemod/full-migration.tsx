// Every fixable recommended-v2 rule on one 1.x file (TASK-060): `oxlint --fix` must converge.
import { createContext, createEffect, createSignal, ErrorBoundary, For, onMount, Suspense } from "solid-js";
import { Portal } from "solid-js/web";
import { createStore, reconcile } from "solid-js/store";
import type { JSX } from "solid-js";

declare function measure(): void;
declare const el: HTMLElement;
type Row = { _id: string; name: string };
declare const fresh: Row[];

const Theme = createContext("light");

export function Toolbar({ label, ...rest }: { label: string; disabled?: boolean }): JSX.Element {
  return <button {...rest}>{label}</button>;
}

export function Page(props: { rows: Row[]; active: boolean }) {
  const [title] = createSignal("");
  const [store, setStore] = createStore<{ rows: Row[] }>({ rows: [] });
  const save = () => setStore((s) => reconcile(fresh, { key: "_id" })(s.rows));
  onMount(() => measure());
  createEffect(
    () => title(),
    (value) => (el.title = value),
  );
  return (
    <Theme.Provider value="dark">
      <ErrorBoundary fallback={(err) => <p>{err.message}</p>}>
        <Suspense fallback={<p>loading</p>}>
          <Portal>
            <ul class="list" classList={{ active: props.active }}>
              {store.rows.map((row) => (
                <li onclick={save}>{row.name}</li>
              ))}
            </ul>
            <For each={props.rows}>{(row) => <Toolbar label={row.name} />}</For>
          </Portal>
        </Suspense>
      </ErrorBoundary>
    </Theme.Provider>
  );
}
