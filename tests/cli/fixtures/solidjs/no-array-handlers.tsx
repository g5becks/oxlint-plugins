// ── VALID ──────────────────────────────────────────────
function ValidHandler() {
  const handler = () => console.log("click");
  return <button onClick={handler}>Click</button>;
}

// ── INVALID ────────────────────────────────────────────

// 1) array as onClick handler
function ArrayHandler() {
  const handler = (data: string) => console.log(data);
  return <button onClick={[handler, "hello"]}>Click</button>;
}

// 2) array as onInput handler
function ArrayInputHandler() {
  const handler = (data: number) => console.log(data);
  return <input onInput={[handler, 42]} />;
}
