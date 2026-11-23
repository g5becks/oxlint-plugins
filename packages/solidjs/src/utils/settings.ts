import type { Context } from "@oxlint/plugins";

/**
 * `settings.solidjs` (shared by all solidjs rules):
 *
 *   "settings": {
 *     "solidjs": { "version": 2 }
 *   }
 *
 * - `version`: the Solid major version the code targets, `1` (default) or `2`. Rules whose
 *   advice differs between 1.x and 2.0 branch on it; rules that only exist for 2.0 report nothing
 *   at version 1.
 *
 * Invalid values never crash a rule: anything but the number `2` means version 1.
 */

export type SolidVersion = 1 | 2;

export interface SolidSettings {
  readonly version: SolidVersion;
}

const DEFAULTS: SolidSettings = { version: 1 };
const V2: SolidSettings = { version: 2 };

// Parsed once per settings object (oxlint passes the same object for every file of a config).
const cache = new WeakMap<object, SolidSettings>();

export function parseSolidSettings(settings: unknown): SolidSettings {
  if (typeof settings !== "object" || settings === null) return DEFAULTS;
  const cached = cache.get(settings);
  if (cached) return cached;

  const raw = (settings as { solidjs?: unknown }).solidjs;
  const version = typeof raw === "object" && raw !== null ? (raw as { version?: unknown }).version : undefined;
  const parsed = version === 2 ? V2 : DEFAULTS;
  cache.set(settings, parsed);
  return parsed;
}

/** The Solid version from `settings.solidjs.version`; never throws. */
export function readSolidVersion(context: Pick<Context, "settings">): SolidVersion {
  try {
    return parseSolidSettings(context?.settings).version;
  } catch {
    return DEFAULTS.version;
  }
}
