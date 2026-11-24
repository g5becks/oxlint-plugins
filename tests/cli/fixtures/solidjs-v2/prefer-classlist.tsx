// solidjs/prefer-classlist at settings.solidjs.version 2 (TASK-049): retired, so nothing here is reported.
declare function cn(...args: unknown[]): string;

export const Card = (props: { active: boolean }) => <div class={cn({ active: props.active })} />;
