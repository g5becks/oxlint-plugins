// ── VALID ──────────────────────────────────────────────
function ValidComp() {
  return <div>Hello</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) undefined component
function UsingUndef() {
  return <UndefinedComponent />;
}

// 2) Show without import
function UsingShow() {
  return <Show when={true}>Content</Show>;
}
