// Audit R3 probe: `--fix` must never rewrite `throw` into `return` here.
import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();

export function all(ids: string[]) {
  return ids.map((id) => {
    if (!id) throw UserError.not_found`missing ${"id"}`({ id });
    return id;
  });
}

export function withFinally(cleanup: () => void) {
  try {
    throw UserError.invalid`bad`;
  } finally {
    cleanup();
  }
}
