// Audit R1 probe: error sets imported from a re-exporting module (agentx's
// `@agentx/core` pattern) instead of being defined in the same file.
import { UserError } from "@agentx/core";

export function a(id: string) {
  throw UserError.not_found`missing ${"id"}`({ id }); // report
}
