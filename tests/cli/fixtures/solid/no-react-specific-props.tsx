// ── VALID ──────────────────────────────────────────────
function ValidComp() {
  return <div class="container">Hello</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) className instead of class
function BadClassName() {
  return <div className="container">Hello</div>;
}

// 2) htmlFor instead of for
function BadHtmlFor() {
  return <label htmlFor="input">Label</label>;
}
