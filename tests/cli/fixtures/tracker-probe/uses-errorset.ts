import { errorSet, isErr } from "@takinprofit/errorset";
import { readFile } from "node:fs/promises";
const UserError = errorSet("UserError", ["not_found"]).init();
let counter = 0;
export function load(id: string) {
  const data = readFile(id);
  if (!data) throw UserError.not_found`missing ${id}`;
  return data;
}
export function check(r: unknown) {
  return isErr(r) ? r.data : null;
}
