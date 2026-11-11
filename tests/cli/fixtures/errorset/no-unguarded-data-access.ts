import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();
declare function getUser(): any;

const result = getUser();
if (UserError(result)) {
  console.log(result.data);
}
console.log(result.data); // report
if (isErr(result)) {
  console.log(result.kind);
}
console.log(result.kind); // report
console.log(result.cause); // report
