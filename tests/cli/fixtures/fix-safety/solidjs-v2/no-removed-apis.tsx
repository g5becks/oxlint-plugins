// no-removed-apis autofixes (TASK-045): every fixable rename, applied by real oxlint --fix.
import { createContext, equalFn, ErrorBoundary, For, getListener, Index, onMount, Suspense, SuspenseList } from "solid-js";

declare function measure(): void;
declare const rows: () => Array<{ cells: string[] }>;

const Theme = createContext("light");
const same = equalFn(1, 2);
const listener = getListener();

export function Page() {
  onMount(() => measure());
  return (
    <Theme.Provider value="dark">
      <ErrorBoundary fallback={(err, reset) => <button onClick={reset}>{String(err)}</button>}>
        <SuspenseList revealOrder="forwards" tail="collapsed">
          <Suspense fallback={<p>loading</p>}>
            <Index each={rows()}>{(row, i) => <For each={row().cells}>{(c) => <td data-i={i}>{c}</td>}</For>}</Index>
          </Suspense>
        </SuspenseList>
      </ErrorBoundary>
      <p>{String(same)} {String(listener)}</p>
    </Theme.Provider>
  );
}
