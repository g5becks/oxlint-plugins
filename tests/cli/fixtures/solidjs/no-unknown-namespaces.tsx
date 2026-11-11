// ── VALID ──────────────────────────────────────────────
function ValidNS() {
  return <div on:click={() => console.log("click")}>Click</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) unknown namespace on DOM element
function UnknownNS() {
  return <div foo:bar="value">Content</div>;
}

// 2) style: namespace (confusing, use style prop)
function StyleNS() {
  return <div style:color="red">Styled</div>;
}

// 3) namespace on component (no effect)
function CompNS() {
  const MyComp = (props: any) => <div>{props.children}</div>;
  return <MyComp on:click={() => console.log("click")}>Click</MyComp>;
}
