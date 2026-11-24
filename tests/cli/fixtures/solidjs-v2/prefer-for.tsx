// solidjs/prefer-for at settings.solidjs.version 2 (TASK-053). Marked lines are the reported ones.
import { For, Repeat } from "solid-js";

declare function Skeleton(props: { i: number }): null;

export const List = (props: { items: string[]; n: number }) => (
  <div>
    <ul>
      {props.items.map((item, i) => ( // report
        <li>
          {i}: {item}
        </li>
      ))}
    </ul>
    <div>
      {
        Array.from({ length: props.n }, (_, i) => <Skeleton i={i} />) // report
      }
    </div>
    <For each={props.items}>{(item) => <p>{item}</p>}</For>
    <Repeat count={3}>{(i) => <hr data-i={i} />}</Repeat>
  </div>
);
