// toError(err) is the sanctioned adapter for APIs that need a thrown Error: not reported.
import { errorSet, toError } from "@takinprofit/errorset";

type User = { id: string };

export const UserError = errorSet("UserError", ["not_found"]).init<User>();

export function boundary(r: any): User | typeof UserError.Type {
  if (UserError(r)) throw toError(r);
  if (!r) return UserError.not_found`User ${"id"} not found`({ id: "1" });
  return r;
}
