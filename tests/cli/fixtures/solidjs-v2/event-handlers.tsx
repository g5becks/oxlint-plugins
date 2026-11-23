// solidjs/event-handlers at settings.solidjs.version 2 (TASK-052). Marked lines are the reported ones.
declare function save(): void;

function increment() {}

export const Panel = (props: { onSelect?: () => void }) => (
  <div>
    <button
      onclick={increment} // report
    />
    <button onClick={save} />
    <link rel="preload" href="/a.css" onload="this.rel='stylesheet'" />
    <div
      onmouseover={props.onSelect} // report
    />
    <div
      {...{
        onkeydown: () => save(), // report
      }}
    />
  </div>
);
