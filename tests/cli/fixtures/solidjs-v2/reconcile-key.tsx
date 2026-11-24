// solidjs/reconcile-key at settings.solidjs.version 2 (TASK-055). Marked lines are the reported ones.
import { createStore, reconcile } from "solid-js";

type Row = { _id: string; name: string };
declare const fresh: Row[];

export function useRows() {
  const [rows, setRows] = createStore<{ list: Row[] }>({ list: [] });
  const load = () => {
    setRows((s) => {
      reconcile(fresh)(s.list); // report
    });
    setRows((s) => {
      reconcile(fresh, "_id")(s.list);
    });
    setRows((s) => {
      reconcile(fresh, { key: "_id" })(s.list); // report
    });
  };
  return { rows, load };
}
