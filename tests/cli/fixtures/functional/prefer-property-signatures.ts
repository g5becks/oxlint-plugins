// ── VALID ──────────────────────────────────────────────
interface ValidListener {
  onChange: (x: number) => void;
  onError: (err: Error) => void;
}

// ── INVALID ────────────────────────────────────────────

// 1) method signature in interface
interface BadListener {
  notify(): void;
  handle(data: any): string;
}

// 2) method signature in type
type BadCallbacks = {
  onSuccess(value: any): void;
  onError(error: Error): void;
};
