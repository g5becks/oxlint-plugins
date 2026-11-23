// imports autofixes at version 2 (TASK-048): import paths and 2.0 module moves.
import { createSignal, render } from "solid-js";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { createStore } from "solid-js/store";
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
