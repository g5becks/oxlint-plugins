// solidjs/for-keyed-literal at settings.solidjs.version 2 (TASK-057). Marked lines are the reported ones.
import { For } from "solid-js";

type Row = { id: string; name: string };

export const Rows = (props: { rows: Row[]; byIndex: boolean }) => (
  <>
    <For
      each={props.rows}
      keyed={!props.byIndex} // report
    >
      {(row) => <p>{String(row)}</p>}
    </For>
    <For each={props.rows} keyed={false}>
      {(row) => <p>{row().name}</p>}
    </For>
    <For each={props.rows} keyed={(r) => r.id}>
      {(row) => <p>{row().name}</p>}
    </For>
  </>
);
