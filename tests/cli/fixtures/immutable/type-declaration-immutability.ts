// ── VALID ──────────────────────────────────────────────
type GoodUser = {
  readonly name: string;
  readonly age: number;
};

interface GoodSettings {
  readonly option1: string;
  readonly option2: number;
}

// ── INVALID ────────────────────────────────────────────

// 1) type alias with mutable members
type BadUser = {
  name: string;
  age: number;
};

// 2) interface with mutable members
interface BadSettings {
  option1: string;
  option2: number;
}

// 3) type with mixed — one readonly, one not
type MixedConfig = {
  readonly debug: boolean;
  timeout: number;
};
