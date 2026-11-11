import { createSignal, For, Show } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <div>
      <Show when={count() > 0}>
        <p>Count is positive</p>
      </Show>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
      <For each={[1, 2, 3]}>
        {(item) => <span>{item}</span>}
      </For>
    </div>
  );
}

function Link() {
  return <a href="https://example.com">Safe link</a>;
}
