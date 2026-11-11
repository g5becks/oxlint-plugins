// ── VALID ──────────────────────────────────────────────
const x = 1;
const name = "hello";

// ── INVALID ────────────────────────────────────────────

// 1) simple let
let count = 0;

// 2) let with type annotation
let message: string = "hello";

// 3) let in for loop
for (let i = 0; i < 10; i++) {
  console.log(i);
}
