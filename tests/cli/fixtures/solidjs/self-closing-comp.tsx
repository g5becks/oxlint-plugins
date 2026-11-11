// ── VALID ──────────────────────────────────────────────
function Valid() {
  return <MyComponent />;
}

function ValidWithChildren() {
  return <div>Content</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) empty component not self-closed
function EmptyComp() {
  return <MyComponent></MyComponent>;
}

// 2) empty HTML element not self-closed
function EmptyDiv() {
  return <div></div>;
}
