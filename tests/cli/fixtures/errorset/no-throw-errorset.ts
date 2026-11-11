import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();

export function getUser(id: string) {
  throw UserError.not_found`User ${"id"} not found`({ id }); // report
}

export function validate() {
  throw UserError.invalid`Invalid input`; // report
}

export function ok(id: string) {
  return UserError.not_found`User ${"id"} not found`({ id });
}

export function generic() {
  throw new Error("generic");
}
