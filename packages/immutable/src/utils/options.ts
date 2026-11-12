import type { Context } from "@oxlint/plugins";

/**
 * The rule's options object (`context.options[0]`), typed. oxlint and ESLint validate options
 * against the rule's `meta.schema` before the rule runs, so the cast only names a checked shape.
 */
export function ruleOptions<T extends object>(context: Context): Partial<T> | undefined {
  return context.options?.[0] as Partial<T> | undefined;
}
