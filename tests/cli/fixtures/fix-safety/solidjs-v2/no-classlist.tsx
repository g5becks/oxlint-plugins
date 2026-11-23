// no-classlist autofix (TASK-050): classList into class object/array values.
declare function Card(props: { classList?: Record<string, boolean> }): null;

export const Item = (props: { active: boolean; error?: boolean; class?: string }) => (
  <>
    <div
      class="card"
      classList={{ active: props.active }}
    />
    <span
      classList={{ error: !!props.error }}
    />
    <p
      classList={{ muted: true }}
      class={props.class}
    />
    <Card classList={{ active: props.active }} />
  </>
);
