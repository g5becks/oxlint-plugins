/**
 * `settings.errorset` (shared by all errorset rules):
 *
 *   "settings": {
 *     "errorset": {
 *       "modules": ["@agentx/core"],
 *       "guardPattern": "^[A-Z]\\w*(Error|Err)$"
 *     }
 *   }
 *
 * - `modules`: modules that re-export error sets. Named imports from them whose imported name
 *   matches `guardPattern` are treated as error-set guards, and `errorSet` / `isErr` imported
 *   from them are recognized like imports from `@takinprofit/errorset`. `@takinprofit/errorset`
 *   itself is always recognized. Default: `["@takinprofit/errorset"]`.
 * - `guardPattern`: regular expression (string) an imported name must match to be a guard.
 *   Default: `^[A-Z]\w*(Error|Err)$`.
 *
 * Invalid values never crash a rule: a `modules` value that isn't an array of non-empty strings,
 * or a `guardPattern` that isn't a string compiling to a RegExp, is ignored and the default is
 * used for that key.
 */

export const ERRORSET_SOURCE = "@takinprofit/errorset";
export const DEFAULT_GUARD_PATTERN = "^[A-Z]\\w*(Error|Err)$";

export interface ErrorsetSettings {
  /** Re-export modules plus `@takinprofit/errorset`. */
  readonly modules: ReadonlySet<string>;
  readonly guardPattern: RegExp;
}

const DEFAULTS: ErrorsetSettings = {
  modules: new Set([ERRORSET_SOURCE]),
  guardPattern: new RegExp(DEFAULT_GUARD_PATTERN),
};

// Parsed once per settings object (oxlint passes the same object for every file of a config).
const cache = new WeakMap<object, ErrorsetSettings>();

export function parseErrorsetSettings(settings: unknown): ErrorsetSettings {
  if (typeof settings !== "object" || settings === null) return DEFAULTS;
  const cached = cache.get(settings);
  if (cached) return cached;

  const raw = (settings as { errorset?: unknown }).errorset;
  let parsed = DEFAULTS;
  if (typeof raw === "object" && raw !== null) {
    const { modules, guardPattern } = raw as { modules?: unknown; guardPattern?: unknown };
    const validModules =
      Array.isArray(modules) && modules.every((m) => typeof m === "string" && m.length > 0)
        ? new Set<string>([ERRORSET_SOURCE, ...(modules as string[])])
        : DEFAULTS.modules;
    let pattern = DEFAULTS.guardPattern;
    if (typeof guardPattern === "string") {
      try {
        pattern = new RegExp(guardPattern);
      } catch {
        pattern = DEFAULTS.guardPattern;
      }
    }
    parsed = { modules: validModules, guardPattern: pattern };
  }
  cache.set(settings, parsed);
  return parsed;
}

/** Read `settings.errorset` from a rule context; never throws. */
export function readErrorsetSettings(context: any): ErrorsetSettings {
  try {
    return parseErrorsetSettings(context?.settings);
  } catch {
    return DEFAULTS;
  }
}
