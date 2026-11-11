// ── VALID ──────────────────────────────────────────────
function ValidStyle() {
  return <div style={{ "font-size": "16px", "background-color": "red" }}>Styled</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) string style
function StringStyle() {
  return <div style="color: red; font-size: 14px;">Styled</div>;
}

// 2) camelCase CSS property
function CamelStyle() {
  return <div style={{ fontSize: "16px" }}>Styled</div>;
}

// 3) numeric value without unit
function NumericStyle() {
  return <div style={{ width: 100 }}>Styled</div>;
}
