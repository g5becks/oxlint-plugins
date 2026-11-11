import { createSignal, createEffect } from "solid-js";

// ── VALID ──────────────────────────────────────────────
function ValidReactive() {
  const [count, setCount] = createSignal(0);
  createEffect(() => {
    console.log(count());
  });
  return <div>{count()}</div>;
}

// ── INVALID ────────────────────────────────────────────

// 1) signal not called in JSX
function UncalledSignal() {
  const [count, setCount] = createSignal(0);
  return <div>{count}</div>;
}

// 2) async createEffect
function AsyncEffect() {
  const [data, setData] = createSignal("");
  createEffect(async () => {
    const result = await fetch("/api");
    setData(await result.text());
  });
  return <div>{data()}</div>;
}
