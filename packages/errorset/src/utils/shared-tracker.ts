import type { ESTree } from "@oxlint/plugins";
import { createErrorsetImportTracker, type ErrorsetImportTracker } from "./detect-errorset-imports.ts";
import type { ErrorsetSettings } from "./settings.ts";

/**
 * One import tracker per file, shared by all errorset rules (audit R6, TASK-032).
 *
 * Follows the per-file shared cache pattern documented in @oxlint/plugins (eslintCompatPlugin):
 * every rule's `before()` hook runs before any rule visits the AST, and every `after()` hook runs
 * after all rules finished the file and before the next file starts (oxlint and eslintCompatPlugin
 * alike). Rules acquire the file's tracker in `before()` and release it in `after()`; the last
 * release drops it. A rule whose `before()` returns false never acquires (oxlint doesn't run its
 * `after()` then). Each ImportDeclaration / VariableDeclaration is processed once per file, by the
 * first rule that visits it; the other rules see the same state at the same point of traversal.
 */
interface FileTracker {
  tracker: ErrorsetImportTracker;
  processed: WeakSet<ESTree.Node>;
}

let current: FileTracker | null = null;
let users = 0;

/** Test hook: counts are published on globalThis only when this env var is set. */
const STATS_KEY = Symbol.for("oxlint-plugin-errorset/tracker-stats");
const publishStats = typeof process !== "undefined" && process.env?.OXLINT_PLUGIN_ERRORSET_STATS === "1";
const stats = { trackersCreated: 0, nodesProcessed: 0 };
if (publishStats) (globalThis as Record<symbol, unknown>)[STATS_KEY] = stats;

/** Counters since module load (tests: trackers created, declaration nodes processed). */
export function trackerStats(): Readonly<typeof stats> {
  return { ...stats };
}

function acquire(settings: ErrorsetSettings): void {
  if (current === null) {
    const tracker = createErrorsetImportTracker();
    tracker.reset(settings);
    current = { tracker, processed: new WeakSet() };
    stats.trackersCreated++;
  }
  users++;
}

function release(): void {
  users--;
  if (users <= 0) {
    users = 0;
    current = null;
  }
}

function file(): FileTracker {
  if (current === null) throw new Error("errorset: import tracker used outside before()/after()");
  return current;
}

function processOnce(node: ESTree.Node, handle: (tracker: ErrorsetImportTracker) => void): void {
  const f = file();
  if (f.processed.has(node)) return;
  f.processed.add(node);
  stats.nodesProcessed++;
  handle(f.tracker);
}

/** A rule's handle on the shared per-file tracker. */
export interface SharedTrackerHandle extends Omit<ErrorsetImportTracker, "reset"> {
  /** In before() (only when the rule runs on the file): use the file's shared tracker. */
  acquire(settings: ErrorsetSettings): void;
  /** In after(): stop using it; the last rule's release drops it. */
  release(): void;
}

export function sharedTrackerHandle(): SharedTrackerHandle {
  let acquired = false;
  return {
    acquire(settings) {
      // A rule acquires at most once per file (defensive: after() always runs before the next file).
      if (acquired) release();
      acquire(settings);
      acquired = true;
    },
    release() {
      if (!acquired) return;
      acquired = false;
      release();
    },
    handleImportDeclaration: (node) => processOnce(node, (t) => t.handleImportDeclaration(node)),
    handleVariableDeclaration: (node) => processOnce(node, (t) => t.handleVariableDeclaration(node)),
    hasErrorsetImport: () => file().tracker.hasErrorsetImport(),
    isErrorsetFactory: (name) => file().tracker.isErrorsetFactory(name),
    isErrorsetGuard: (name) => file().tracker.isErrorsetGuard(name),
    isIsErrImport: (name) => file().tracker.isIsErrImport(name),
    guardNames: () => file().tracker.guardNames(),
    mergedGuardNames: () => file().tracker.mergedGuardNames(),
    isErrorsetExport: (localName, exportName) => file().tracker.isErrorsetExport(localName, exportName),
    guardForSetName: (setName) => file().tracker.guardForSetName(setName),
  };
}
