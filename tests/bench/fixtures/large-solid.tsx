import { createSignal, createEffect, createMemo, For, Show, Switch, Match, onCleanup } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);

  return (
    <div>
      <span>{count()}</span>
      <span>{doubled()}</span>
      <button onClick={() => setCount(count() + 1)}>+</button>
      <button onClick={() => setCount(count() - 1)}>-</button>
    </div>
  );
}

function TodoList() {
  const [todos, setTodos] = createSignal<Array<{ id: number; text: string; done: boolean }>>([]);
  const [input, setInput] = createSignal("");

  const remaining = createMemo(() => todos().filter((t) => !t.done).length);
  const completed = createMemo(() => todos().filter((t) => t.done).length);

  const addTodo = () => {
    const text = input().trim();
    if (text) {
      setTodos([...todos(), { id: Date.now(), text, done: false }]);
      setInput("");
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <div>
      <input value={input()} onInput={(e) => setInput(e.currentTarget.value)} />
      <button onClick={addTodo}>Add</button>
      <p>
        {remaining()} remaining, {completed()} completed
      </p>
      <For each={todos()}>
        {(todo) => (
          <div>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
            <span style={{ "text-decoration": todo.done ? "line-through" : "none" }}>
              {todo.text}
            </span>
          </div>
        )}
      </For>
    </div>
  );
}

function UserProfile(props: { userId: string; showEmail: boolean }) {
  const [user, setUser] = createSignal<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    setLoading(true);
    fetch(`/api/users/${props.userId}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      });
  });

  return (
    <div>
      <Show when={!loading()} fallback={<p>Loading...</p>}>
        <Show when={user()}>
          {(u) => (
            <div>
              <h2>{u().name}</h2>
              <Show when={props.showEmail}>
                <p>{u().email}</p>
              </Show>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}

function TabPanel(props: { activeTab: string }) {
  return (
    <Switch fallback={<p>Unknown tab</p>}>
      <Match when={props.activeTab === "home"}>
        <div>Home Content</div>
      </Match>
      <Match when={props.activeTab === "about"}>
        <div>About Content</div>
      </Match>
      <Match when={props.activeTab === "contact"}>
        <div>Contact Content</div>
      </Match>
    </Switch>
  );
}

function Timer() {
  const [seconds, setSeconds] = createSignal(0);
  const [running, setRunning] = createSignal(false);

  createEffect(() => {
    if (running()) {
      const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
      onCleanup(() => clearInterval(interval));
    }
  });

  const formatted = createMemo(() => {
    const s = seconds();
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  });

  return (
    <div>
      <span>{formatted()}</span>
      <button onClick={() => setRunning(!running())}>
        {running() ? "Pause" : "Start"}
      </button>
      <button onClick={() => { setSeconds(0); setRunning(false); }}>Reset</button>
    </div>
  );
}

function SearchBox() {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<string[]>([]);

  createEffect(() => {
    const q = query();
    if (q.length >= 2) {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then(setResults);
    } else {
      setResults([]);
    }
  });

  return (
    <div>
      <input
        value={query()}
        onInput={(e) => setQuery(e.currentTarget.value)}
        placeholder="Search..."
      />
      <Show when={results().length > 0}>
        <ul>
          <For each={results()}>
            {(result) => <li>{result}</li>}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function DataGrid(props: { rows: Array<Record<string, string>>; columns: string[] }) {
  return (
    <table>
      <thead>
        <tr>
          <For each={props.columns}>
            {(col) => <th>{col}</th>}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={props.rows}>
          {(row) => (
            <tr>
              <For each={props.columns}>
                {(col) => <td>{row[col]}</td>}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

function Accordion(props: { items: Array<{ title: string; content: string }> }) {
  const [openIndex, setOpenIndex] = createSignal<number | null>(null);

  return (
    <div>
      <For each={props.items}>
        {(item, index) => (
          <div>
            <button onClick={() => setOpenIndex(openIndex() === index() ? null : index())}>
              {item.title}
            </button>
            <Show when={openIndex() === index()}>
              <div>{item.content}</div>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}
