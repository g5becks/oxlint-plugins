// ── VALID ──────────────────────────────────────────────
function ValidComp(props: { name: string; count: number }) {
  return <div>{props.name}: {props.count}</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) destructuring props in component
function DestructuredComp({ name, count }: { name: string; count: number }) {
  return <div>{name}: {count}</div>;
}

// 2) arrow function destructuring
const ArrowComp = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}>Click</button>
);
