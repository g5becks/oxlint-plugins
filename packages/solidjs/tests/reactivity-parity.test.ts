import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// Audit R11: the two reactivity differences seen against upstream eslint-plugin-solid 0.19.0 are
// behavior changes between upstream 0.14.5 (which the port follows) and 0.19.0, not port bugs.
// Measured 2026-11-11 (TASK-024) on these exact snippets: 0.14.5 and the port report the
// makePersisted case and not the query factory; 0.19.0 does the opposite.
// See PARITY.md#solid-reactivity-0145-vs-0190.
const rule = ruleOf(plugin, "reactivity");

ruleTester("tsx").run("reactivity: upstream 0.14.5 behavior (audit R11)", rule, {
  valid: [
    // 0.19.0 reports `query` (captured at setup, read in queryFn); 0.14.5 and the port don't.
    `import { createSignal } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
export function Search() {
  const [debounced] = createSignal("");
  const q = useQuery(() => {
    const query = debounced();
    return { queryKey: ["tickers", query], queryFn: async () => query };
  });
  return <div>{q.data}</div>;
}`,
  ],
  invalid: [
    // 0.14.5 and the port ask for direct array destructuring of createSignal (agentx
    // auth-store.tsx:34); 0.19.0 accepts the makePersisted wrapper.
    {
      code: `import { createSignal } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
export function useToken() {
  const [token, setToken] = makePersisted(createSignal(""), { name: "token" });
  return { token, setToken };
}`,
      errors: [{ messageId: "shouldDestructure", line: 4 }],
    },
  ],
});
