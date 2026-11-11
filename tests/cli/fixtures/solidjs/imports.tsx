// ── VALID ──────────────────────────────────────────────
import { createSignal } from "solid-js";
import { render } from "solid-js/web";

function ValidApp() {
  const [count] = createSignal(0);
  render(() => <div>{count()}</div>, document.body);
  return null;
}

// ── INVALID ────────────────────────────────────────────

// 1) createSignal from wrong source
import { createSignal as wrongSignal } from "solid-js/web";

function BadImport() {
  const [val] = wrongSignal(0);
  return <div>{val()}</div>;
}
