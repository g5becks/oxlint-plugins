// ── VALID ──────────────────────────────────────────────
function Valid() {
  return <div class="foo" id="bar" />;
}

// ── INVALID ────────────────────────────────────────────

// 1) duplicate prop
function DupProp() {
  return <div class="foo" class="bar" />;
}

// 2) duplicate id
function DupId() {
  return <div id="a" id="b" />;
}
