import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-059: jsx-no-undef's auto-import list at settings.solidjs.version 2: Show, For, Switch, Match,
// Loading, Errored, Repeat, Reveal (RFC 03; solid-js 2.0.3 types/client/flow.d.ts). Index is gone.
const rule = ruleOf(plugin, "jsx-no-undef");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("jsx-no-undef (version 2)", rule, {
  valid: [],
  invalid: [
    {
      code: `const A = () => <Loading fallback={<p />}><Repeat count={2}>{(i) => i}</Repeat></Loading>;`,
      output: `import { Loading, Repeat } from "solid-js";\nconst A = () => <Loading fallback={<p />}><Repeat count={2}>{(i) => i}</Repeat></Loading>;`,
      errors: [{ messageId: "autoImport" }],
      settings,
    },
    {
      code: `import { For } from "solid-js";\nconst A = () => <Errored fallback={<p />}><Reveal><For each={[]}>{(x) => x}</For></Reveal></Errored>;`,
      output: `import { For, Errored, Reveal } from "solid-js";\nconst A = () => <Errored fallback={<p />}><Reveal><For each={[]}>{(x) => x}</For></Reveal></Errored>;`,
      errors: [{ messageId: "autoImport" }],
      settings,
    },
    // Index doesn't exist in 2.0: it's undefined, not auto-imported.
    {
      code: `const A = () => <Index each={[]}>{(x) => x()}</Index>;`,
      output: null,
      errors: [{ messageId: "undefined" }],
      settings,
    },
  ],
});

tester.run("jsx-no-undef (version 1 controls)", rule, {
  valid: [],
  invalid: [
    {
      code: `const A = () => <Index each={[]}>{(x) => x()}</Index>;`,
      output: `import { Index } from "solid-js";\nconst A = () => <Index each={[]}>{(x) => x()}</Index>;`,
      errors: [{ messageId: "autoImport" }],
    },
    { code: `const A = () => <Loading />;`, output: null, errors: [{ messageId: "undefined" }] },
  ],
});
