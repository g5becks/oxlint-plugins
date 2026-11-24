// solidjs/no-destructure at settings.solidjs.version 2 (TASK-058). Marked lines are the reported ones.
import { Show } from "solid-js";

export const Title = (
  { title }: { title: string }, // report
) => <h1>{title}</h1>;

export function Button(
  { label, ...rest }: { label: string; disabled?: boolean }, // report
) {
  return <button {...rest}>{label}</button>;
}

export const Badge = (
  { size = "m" }: { size?: string }, // report
) => (
  <Show when={size}>
    <b>{size}</b>
  </Show>
);
