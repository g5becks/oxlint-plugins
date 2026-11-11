// ── VALID ──────────────────────────────────────────────
function ValidHandler() {
  return <button onClick={() => console.log("click")}>Click</button>;
}

// ── INVALID ────────────────────────────────────────────

// 1) lowercase event handler
function LowercaseHandler() {
  return <input onchange={() => console.log("change")} />;
}

// 2) static string as event handler
function StaticHandler() {
  return <button onClick={"alert('hi')"}>Click</button>;
}
