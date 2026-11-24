// no-destructure autofix at version 2 (TASK-058): property access, and omit() for a rest element.
import { Show } from "solid-js";

export const Title = ({ title }: { title: string }) => <h1>{title}</h1>;

export function Button({ label, ...rest }: { label: string; disabled?: boolean }) {
  return (
    <Show when={label}>
      <button {...rest}>{label}</button>
    </Show>
  );
}
