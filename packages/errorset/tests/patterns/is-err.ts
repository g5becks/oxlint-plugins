// isErr from errorset is a guard everywhere (narrowing and no-catch-errorset).
import { errorSet, isErr } from "@takinprofit/errorset";

type Order = { id: string };

export const OrderError = errorSet("OrderError", ["rejected"]).init<Order>();

export function handle(r: any): unknown {
  if (isErr(r)) {
    return r.kind;
  }
  if (OrderError(r)) return r.data;
  return r.data; // report: no-unguarded-data-access
}

export function caught(run: () => void): unknown {
  try {
    run();
  } catch (e) {
    if (isErr(e)) return e; // report: no-catch-errorset
  }
  return OrderError.rejected`rejected`;
}
