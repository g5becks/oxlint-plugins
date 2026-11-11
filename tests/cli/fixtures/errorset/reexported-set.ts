// Audit R1 probe: error sets imported from a re-exporting module (agentx's
// `@agentx/core` pattern) instead of being defined in the same file.
// Linted with settings.errorset.modules = ["@agentx/core"]: 3 violations.
import { UserError } from "@agentx/core";
declare function run(): void;

export function a(id: string) {
  throw UserError.not_found`missing ${"id"}`({ id }); // report
}

export function b() {
  try { run(); } catch (e) { if (UserError(e)) { return 1; } } // report
  return 0;
}

export function c(id: string) {
  if (!id) throw new Error("id is required"); // report
  return UserError.not_found`missing ${"id"}`({ id });
}
