// solidjs/no-unknown-namespaces at settings.solidjs.version 2 (TASK-051). Marked lines are the reported ones.
declare function save(): void;
declare function tooltip(options: { content: string }): (el: Element) => void;
declare const muted: () => boolean;

export const Toolbar = () => (
  <div>
    <button
      on:click={save} // report
    />
    <video
      bool:muted={muted()} // report
    />
    <button
      use:tooltip={{ content: "Save" }} // report
    />
    <input prop:value="x" />
    <svg xmlns:xlink="http://www.w3.org/1999/xlink" xml:lang="en">
      <use xlink:href="#icon" />
    </svg>
  </div>
);
