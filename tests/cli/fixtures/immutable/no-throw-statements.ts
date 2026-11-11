// ── VALID ──────────────────────────────────────────────
function safeValidate(input: string): string | null {
  if (!input) return null;
  return input;
}

// ── INVALID ────────────────────────────────────────────

// 1) throw in regular function
function validate(input: string): void {
  if (!input) {
    throw new Error("Input is required");
  }
}

// 2) throw at top level
if (typeof globalThis === "undefined") {
  throw new Error("globalThis not available");
}

// 3) throw in async function
async function fetchData(): Promise<string> {
  throw new Error("not implemented");
}
