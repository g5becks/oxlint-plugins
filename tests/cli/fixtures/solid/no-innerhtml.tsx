// ── VALID ──────────────────────────────────────────────
function ValidComp() {
  return <div innerHTML={"<p>Static HTML</p>"} />;
}

// ── INVALID ────────────────────────────────────────────

// 1) innerHTML with dynamic value
function DynamicInner() {
  const html = "<script>alert('xss')</script>";
  return <div innerHTML={html} />;
}

// 2) dangerouslySetInnerHTML (React pattern)
function ReactPattern() {
  return <div dangerouslySetInnerHTML={{ __html: "<p>test</p>" }} />;
}
