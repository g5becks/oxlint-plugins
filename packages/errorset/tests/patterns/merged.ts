// errorset 0.5: merged guards (`merge(A, B)` and `A.merge(B)`) and `err.set` narrowing.
import { errorSet, merge } from "@takinprofit/errorset";

type User = { id: string };
type Db = { query: string };

export const UserError = errorSet("UserError", ["not_found", "suspended"]).init<User>();
export const DbError = errorSet("DbError", ["timeout", "not_found"]).init<Db>();
export const ServiceError = merge(UserError, DbError);
export const ServiceError2 = UserError.merge(DbError);

export function narrowed(r: any): unknown {
  if (ServiceError(r)) {
    if (r.set === "DbError") {
      return r.data.query;
    }
    return r.message;
  }
  if (ServiceError2(r)) return r.kind;
  return r.set === "UserError" ? r.data : null;
}

export function unguarded(r: any): unknown {
  if (ServiceError(r)) {
    console.log("service error");
  }
  return r.data; // report: no-unguarded-data-access
}

export function kinds(r: any): number {
  if (ServiceError(r)) {
    if (r.kind === "timeout") return 1; // report: prefer-guard-over-manual-kind-check
  }
  if (ServiceError(r) && r.set === "DbError") {
    if (r.kind === "timeout") return 2; // report: prefer-guard-over-manual-kind-check
  }
  return 0;
}

export function caught(run: () => void): number {
  try {
    run();
  } catch (e) {
    if (ServiceError(e)) return 1; // report: no-catch-errorset
    if (ServiceError2(e)) return 2; // report: no-catch-errorset
  }
  return 0;
}

export function rehydrate(body: any): unknown {
  // `from()` is not a guard: `body` is not narrowed or tracked by it.
  const err = UserError.from(body);
  if (UserError.not_found(err)) return err.data.id;
  return body.data;
}

export function members(r: any): number {
  // recover / inspect are not kind guards.
  ServiceError.inspect(r, {});
  return UserError.recover(r, { _: () => 0 }) === 0 ? 0 : 1;
}
