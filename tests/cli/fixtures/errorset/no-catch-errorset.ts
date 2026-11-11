import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();
declare function doSomething(): void;

export function a() {
  try { doSomething(); } catch (e) { if (UserError(e)) { console.log("matched"); } } // report: guard
}

export function b() {
  try { doSomething(); } catch (e) { if (e instanceof UserError) { console.log("matched"); } } // report: instanceof
}

export function c() {
  try { doSomething(); } catch (e) { console.log(e.kind); } // report: kind
}

export function d() {
  try { doSomething(); } catch (e) { if (isErr(e)) { console.log("x"); } } // report: isErr
}

export function ok() {
  try { doSomething(); } catch (e) { console.error(e); }
}
