import type { ErrorsetSettings } from "./settings.ts";

/**
 * Whether the file may import a configured errorset module (the library or a
 * `settings.errorset.modules` re-export): its source text mentions one of the module names.
 * Every errorset rule reports only after its import tracker has seen such an import, so a file
 * that never mentions one can be skipped: before() returns false and oxlint (and
 * eslintCompatPlugin) skip the rule's visitor for the file (audit P3, TASK-031). A text check
 * (not the AST) keeps before() from forcing AST deserialization. It over-includes (a mention in a
 * comment keeps the file), and misses only a specifier spelled with escape sequences
 * (`"\u0040takinprofit/errorset"`), which the rules then no longer check.
 */
export function mayImportConfiguredModule(sourceText: string, settings: ErrorsetSettings): boolean {
  for (const module of settings.modules) {
    if (sourceText.includes(module)) return true;
  }
  return false;
}
