// reconcile-key autofix (TASK-055): the 1.x { key } options object becomes the key argument.
import { createStore, reconcile } from "solid-js";

type Row = { _id: string };
declare const fresh: Row[];

export function useRows() {
  const [rows, setRows] = createStore<{ list: Row[] }>({ list: [] });
  setRows((s) => {
    reconcile(fresh, { key: "_id" })(s.list);
  });
  setRows((s) => {
    reconcile(fresh, { key: null, merge: true })(s.list);
  });
  return rows;
}
