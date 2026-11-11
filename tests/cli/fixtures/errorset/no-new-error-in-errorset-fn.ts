import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();

export function getUser(id: string) {
  if (!id) throw new Error("id is required"); // report
  return UserError.not_found`User ${"id"}`({ id });
}

export const check = (id: string) => {
  if (!id) throw new TypeError("required"); // report
  return UserError.invalid`bad input`;
};

export function unrelated() {
  throw new Error("not an errorset function");
}
