import { For } from "solid-js";

// ── VALID ──────────────────────────────────────────────
function ValidList() {
  const items = () => [1, 2, 3];
  return (
    <For each={items()}>
      {(item) => <div>{item}</div>}
    </For>
  );
}

// ── INVALID ────────────────────────────────────────────

// 1) Array.map in JSX
function MapList() {
  const items = [1, 2, 3];
  return (
    <div>
      {items.map((item) => <div>{item}</div>)}
    </div>
  );
}

// 2) Another Array.map in JSX
function MapList2() {
  const users = [{ name: "A" }, { name: "B" }];
  return (
    <ul>
      {users.map((user) => <li>{user.name}</li>)}
    </ul>
  );
}
