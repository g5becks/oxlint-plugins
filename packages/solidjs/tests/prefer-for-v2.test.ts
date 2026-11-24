import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-053: prefer-for at settings.solidjs.version 2. RFC 03 §List rendering, §Index → For
// keyed={false}, §Range/count rendering: Repeat; MIGRATION §New in 2.0.
const rule = ruleOf(plugin, "prefer-for");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("prefer-for (version 2)", rule, {
  valid: [
    `import { For, Repeat } from "solid-js"; const A = () => <ul><For each={items()}>{(i) => <li>{i}</li>}</For><Repeat count={3}>{(i) => <b>{i}</b>}</Repeat></ul>;`,
    // Not in JSX.
    `const rows = Array.from({ length: 3 }, (_, i) => i);`,
  ].map((code) => ({ code, settings })),
  invalid: [
    // One parameter: the same <For> fix as 1.x (default For passes the raw item).
    {
      code: `const A = () => <ul>{items().map((item) => <li>{item}</li>)}</ul>;`,
      output: `const A = () => <ul><For each={items()}>{(item) => <li>{item}</li>}</For></ul>;`,
      errors: [{ messageId: "preferFor" }],
    },
    // Two parameters: no drop-in; the message names For and For keyed={false}, never Index.
    {
      code: `const A = () => <ul>{items().map((item, i) => <li>{i}</li>)}</ul>;`,
      output: null,
      errors: [{ messageId: "preferForV2" }],
    },
    // Count-based lists: <Repeat count={n}> (suggestion when the item parameter is unused).
    {
      code: `import { Show } from "solid-js";\nconst A = () => <div>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} />)}</div>;`,
      output: null,
      errors: [
        {
          messageId: "preferRepeat",
          suggestions: [
            {
              messageId: "suggestRepeat",
              output: `import { Show, Repeat } from "solid-js";\nconst A = () => <div><Repeat count={5}>{(i) => <Skeleton key={i} />}</Repeat></div>;`,
            },
          ],
        },
      ],
    },
    {
      code: `import { Repeat } from "solid-js";\nconst A = (p) => <div>{[...Array(p.n)].map((_, i) => <b>{i}</b>)}</div>;`,
      output: null,
      errors: [
        {
          messageId: "preferRepeat",
          suggestions: [
            {
              messageId: "suggestRepeat",
              output: `import { Repeat } from "solid-js";\nconst A = (p) => <div><Repeat count={p.n}>{(i) => <b>{i}</b>}</Repeat></div>;`,
            },
          ],
        },
      ],
    },
    {
      code: `import { Repeat } from "solid-js";\nconst A = () => <div>{Array(3).fill(0).map(() => <hr />)}</div>;`,
      output: null,
      errors: [
        {
          messageId: "preferRepeat",
          suggestions: [
            {
              messageId: "suggestRepeat",
              output: `import { Repeat } from "solid-js";\nconst A = () => <div><Repeat count={3}>{() => <hr />}</Repeat></div>;`,
            },
          ],
        },
      ],
    },
    // The item parameter is used: no suggestion.
    {
      code: `const A = () => <div>{Array.from({ length: 2 }).map((x, i) => <b>{String(x)}{i}</b>)}</div>;`,
      output: null,
      errors: [{ messageId: "preferRepeat" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("prefer-for (version 1 controls)", rule, {
  valid: [`const A = () => <div>{Array.from({ length: 5 }, (_, i) => <b>{i}</b>)}</div>;`],
  invalid: [
    {
      code: `const A = () => <ul>{items().map((item, i) => <li>{i}</li>)}</ul>;`,
      output: null,
      errors: [{ messageId: "preferForOrIndex" }],
    },
  ],
});
