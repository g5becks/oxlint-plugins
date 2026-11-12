/**
 * Whether a file can't contain JSX: TypeScript-only extensions (`.ts`, `.mts`, `.cts`, including
 * `.d.ts`). JSX-only rules return false from before() for these files, which makes oxlint (and
 * eslintCompatPlugin) skip the rule's visitor for the file (audit P3, TASK-031). `.js`/`.mjs`/`.cjs`
 * may contain JSX, so they are not skipped.
 */
export function cannotContainJSX(filename: string): boolean {
  return /\.[cm]?ts$/.test(filename);
}
