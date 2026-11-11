// errorset 0.5: object-form sets (exact data keys per kind).
import { errorSet } from "@takinprofit/errorset";

type User = { id: string; reason: string };

export const UserError = errorSet("UserError", {
  not_found: ["id"],
  suspended: ["id", "reason"],
  invalid: [],
}).init<User>();

export function load(user: User): User | typeof UserError.Type {
  if (!user.id) throw UserError.invalid`missing id`; // report: no-throw-errorset
  return UserError.not_found`User ${"id"} not found`(user);
}

export function check(user: User): User | Error | typeof UserError.Type {
  if (!user.reason) return new Error("missing reason"); // report: no-new-error-in-errorset-fn
  return UserError.suspended`User ${"id"} is suspended`(user);
}

export function read(result: any): unknown {
  if (UserError.suspended(result)) {
    return result.data.reason;
  }
  if (UserError(result)) {
    if (result.kind === "not_found") return 404; // report: prefer-guard-over-manual-kind-check
  }
  return result.data; // report: no-unguarded-data-access
}
