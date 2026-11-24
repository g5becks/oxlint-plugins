// solidjs/no-classlist at settings.solidjs.version 2 (TASK-050). Marked lines are the reported ones.
declare function Card(props: { classList?: Record<string, boolean> }): null;

export const Item = (props: { active: boolean; error?: boolean; class?: string }) => (
  <>
    <div
      class="card"
      classList={{ active: props.active }} // report
    />
    <span
      classList={{ error: !!props.error }} // report
    />
    <p
      classList={{ muted: true }} // report
      class={props.class}
    />
    <Card classList={{ active: props.active }} />
  </>
);
