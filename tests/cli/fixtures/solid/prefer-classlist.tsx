// ── VALID ──────────────────────────────────────────────
function ValidComp(props: { active: boolean }) {
  return <div classList={{ active: props.active }}>Content</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) classnames with object
function WithCn(props: { active: boolean }) {
  const cn = (obj: Record<string, boolean>) => Object.keys(obj).filter((k) => obj[k]).join(" ");
  return <div class={cn({ active: props.active, disabled: false })}>Content</div>;
}
