// solidjs/imports at settings.solidjs.version 2 (TASK-048). Marked lines are the reported ones.
import { createSignal, render } from "solid-js"; // report
import type { JSX } from "solid-js"; // report
import { Portal } from "solid-js/web"; // report
import { createStore } from "solid-js/store"; // report
import { dynamic } from "@solidjs/web";

export const App = (): JSX.Element => {
  const [n] = createSignal(0);
  const [s] = createStore({ v: 1 });
  const Tag = dynamic(() => "div");
  return (
    <Portal>
      <Tag>{n() + s.v}</Tag>
    </Portal>
  );
};
render(App, document.body);
