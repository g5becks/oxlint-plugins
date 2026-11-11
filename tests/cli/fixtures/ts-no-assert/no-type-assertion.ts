declare const value: unknown;
declare const maybe: string | undefined;

export const a = value as string; // report
export const b = <number>value; // report
export const c = maybe!; // report
export const d = (value as { x: number }).x; // report

export const ok1 = { kind: "x" } as const;
export const ok2 = value as unknown;
export const ok3 = { kind: "x" } satisfies { kind: string };
