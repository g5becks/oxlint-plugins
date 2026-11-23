// solidjs/no-removed-apis at settings.solidjs.version 2 (TASK-045). Marked lines are the reported ones.
import {
  createContext,
  createResource, // report
  ErrorBoundary, // report
  mergeProps, // report
  onMount, // report
  Suspense, // report
} from "solid-js";
import { createStore, produce } from "solid-js/store"; // report

declare function fetchUser(id: number): Promise<{ name: string }>;
declare function measure(): void;

const Theme = createContext("light");

export function Profile(props: { id: number; size?: string }) {
  const merged = mergeProps({ size: "m" }, props);
  const [user] = createResource(() => props.id, fetchUser);
  const [state, setState] = createStore({ n: 0 });
  onMount(() => measure());
  const bump = () => setState(produce((s) => void (s.n += 1)));
  return (
    <Theme.Provider // report
      value="dark"
    >
      <ErrorBoundary fallback={(err) => <p>{err.message}</p>}>
        <Suspense fallback={<p>loading</p>}>
          <button onClick={bump} class={merged.size}>
            {user()?.name} {state.n}
          </button>
          <input
            value={
              /*@once*/ props.size // report
            }
          />
        </Suspense>
      </ErrorBoundary>
    </Theme.Provider>
  );
}
