import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "suspended"]).init();
declare function getUser(): unknown;

export function a() {
  const result = getUser();
  if (UserError(result)) {
    if (result.kind === "suspended") { // report
      return 1;
    }
  }
  return 0;
}

export function b() {
  const result = getUser();
  if (isErr(result)) {
    if (result.kind === "not_found") { // report
      return 1;
    }
  }
  return 0;
}

export function ok() {
  const result = getUser();
  if (UserError.suspended(result)) {
    return 1;
  }
  return 0;
}
