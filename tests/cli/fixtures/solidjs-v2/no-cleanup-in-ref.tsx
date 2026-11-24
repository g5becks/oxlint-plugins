// solidjs/no-cleanup-in-ref at settings.solidjs.version 2 (TASK-056). Marked lines are the reported ones.
import { createEffect, getOwner, onCleanup, onSettled } from "solid-js";

declare function onDown(e: PointerEvent): void;
declare const title: () => string;

function tooltip() {
  let el: Element | undefined;
  onCleanup(() => el?.remove());
  return (next: Element) => {
    el = next;
  };
}

export function Canvas() {
  let el!: HTMLDivElement;
  onSettled(() => {
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  });
  return (
    <>
      <div ref={el} />
      <button ref={tooltip()} />
      <div
        ref={(node) => {
          node.addEventListener("pointerdown", onDown);
          onCleanup(() => node.removeEventListener("pointerdown", onDown)); // report
          void getOwner(); // report
          createEffect(title, (t) => { // report
            node.title = t;
          });
        }}
      />
    </>
  );
}
