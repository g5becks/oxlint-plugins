// ── VALID ──────────────────────────────────────────────
function ValidLink() {
  return <a href="https://example.com">Safe</a>;
}

// ── INVALID ────────────────────────────────────────────

// 1) javascript: URL
function BadLink() {
  return <a href="javascript:alert(1)">Click me</a>;
}

// 2) javascript: with void
function VoidLink() {
  return <a href="javascript:void(0)">No-op</a>;
}
