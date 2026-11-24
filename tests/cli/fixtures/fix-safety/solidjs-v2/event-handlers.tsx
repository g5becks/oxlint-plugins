// event-handlers autofix at version 2 (TASK-052): lowercase handlers with a function value.
declare function save(): void;

function increment() {}

export const Panel = (props: { onSelect?: () => void }) => (
  <div>
    <button
      onclick={increment}
    />
    <button onClick={save} />
    <link rel="preload" href="/a.css" onload="this.rel='stylesheet'" />
    <div
    />
    <div
      {...{
        onkeydown: () => save(),
      }}
    />
  </div>
);
