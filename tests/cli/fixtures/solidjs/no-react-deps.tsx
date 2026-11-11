import { createSignal, createEffect, createMemo } from "solid-js";

// ── VALID ──────────────────────────────────────────────
function ValidEffect() {
  const [count] = createSignal(0);
  createEffect(() => {
    console.log(count());
  });
  return <div>{count()}</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) createEffect with dependency array
function EffectWithDeps() {
  const [count] = createSignal(0);
  createEffect(() => {
    console.log(count());
  }, [count]);
  return <div>{count()}</div>;
}

// 2) createMemo with dependency array
function MemoWithDeps() {
  const [count] = createSignal(0);
  const doubled = createMemo(() => count() * 2, [count]);
  return <div>{doubled()}</div>;
}
