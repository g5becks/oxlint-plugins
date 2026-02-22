// ── VALID ──────────────────────────────────────────────
const resolved = Promise.resolve("ok");

// ── INVALID ────────────────────────────────────────────

// 1) Promise.reject
const rejected = Promise.reject(new Error("oops"));

// 2) Promise constructor with reject parameter
const p = new Promise((resolve, reject) => {
  reject(new Error("failed"));
});
