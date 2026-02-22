import { createStore } from "solid-js/store";

// ── VALID ──────────────────────────────────────────────
function ValidComp() {
  return <div>No proxies here</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) createStore import from solid-js/store
function StoreUser() {
  const [state, setState] = createStore({ count: 0 });
  return <div>{state.count}</div>;
}
