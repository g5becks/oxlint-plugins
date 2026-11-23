// solidjs/no-proxy-apis at settings.solidjs.version 2 (TASK-054). Marked lines are the reported ones.
import {
  createSignal,
  createStore, // report
  merge,
  omit,
} from "solid-js";

export const Box = (props: { size?: string; class?: string }) => {
  const [count] = createSignal(0);
  const [state] = createStore({ n: 0 });
  const merged = merge({ size: "m" }, props);
  const live = merge(
    () => ({ count: count() }), // report
    props,
  );
  const rest = omit(props, "class");
  return <div class={merged.size} data-n={state.n} data-c={live.count} {...rest} />;
};
