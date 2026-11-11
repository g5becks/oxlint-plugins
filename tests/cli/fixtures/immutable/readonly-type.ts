// ── VALID ──────────────────────────────────────────────
type Good = {
  readonly name: string;
  readonly age: number;
};

// ── INVALID ────────────────────────────────────────────

// 1) missing readonly on name
type BadPerson = {
  name: string;
  readonly age: number;
};

// 2) missing readonly on both
type BadConfig = {
  debug: boolean;
  timeout: number;
};

// 3) missing readonly on index signature
type BadMap = {
  readonly label: string;
  [key: string]: any;
};
