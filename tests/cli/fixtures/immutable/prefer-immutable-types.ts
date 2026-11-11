// ── VALID ──────────────────────────────────────────────
function validProcess(data: Readonly<Record<string, any>>): void {
  console.log(data);
}

function validList(items: readonly string[]): void {
  console.log(items);
}

// ── INVALID ────────────────────────────────────────────

// 1) mutable parameter (Record without Readonly)
function processData(data: Record<string, any>): void {
  console.log(data);
}

// 2) mutable array parameter
function modifyItems(items: string[]): void {
  console.log(items);
}

// 3) mutable parameter (object type)
function updateConfig(config: { timeout: number }): void {
  console.log(config);
}
