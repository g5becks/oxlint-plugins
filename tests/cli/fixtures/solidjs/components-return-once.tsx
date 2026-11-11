// ── VALID ──────────────────────────────────────────────
function ValidComp(props: { show: boolean }) {
  return <div>{props.show ? <span>Yes</span> : null}</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) early return breaks reactivity
function EarlyReturn(props: { show: boolean }) {
  if (!props.show) {
    return null;
  }
  return <div>Content</div>;
}

// 2) conditional return
function ConditionalReturn(props: { data: string | null }) {
  if (!props.data) {
    return <div>No data</div>;
  }
  return <div>{props.data}</div>;
}
