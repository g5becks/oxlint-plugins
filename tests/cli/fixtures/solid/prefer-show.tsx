import { Show } from "solid-js";

// ── VALID ──────────────────────────────────────────────
function ValidShow(props: { visible: boolean }) {
  return (
    <Show when={props.visible}>
      <div>Content</div>
    </Show>
  );
}

// ── INVALID ────────────────────────────────────────────

// 1) logical AND in JSX
function AndPattern(props: { visible: boolean }) {
  return <div>{props.visible && <span>Shown</span>}</div>;
}

// 2) ternary in JSX
function TernaryPattern(props: { active: boolean }) {
  return <div>{props.active ? <span>Active</span> : <span>Inactive</span>}</div>;
}
