import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-058: no-destructure at settings.solidjs.version 2. Its 1.x fix generates splitProps/mergeProps,
// which 2.0 removed. MIGRATION §mergeProps / splitProps → merge / omit; RFC 04 §merge, §omit.
const rule = ruleOf(plugin, "no-destructure");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("no-destructure (version 2)", rule, {
  valid: [{ code: `const C = (props) => <h1>{props.title}</h1>;`, settings }],
  invalid: [
    // No rest, no defaults: property access (as in 1.x).
    {
      code: `const C = ({ title }) => <h1>{title}</h1>;`,
      output: `const C = (props) => <h1>{props.title}</h1>;`,
      errors: [{ messageId: "noDestructure" }],
    },
    // Rest: omit, imported if needed (RFC 04 §omit replaces splitProps).
    {
      code: `import { Show } from "solid-js";\nfunction Btn({ label, ...rest }) {\n  return <button {...rest}>{label}</button>;\n}`,
      output: `import { Show, omit } from "solid-js";\nfunction Btn(props) {\n  const rest = omit(props, "label");\n  return <button {...rest}>{props.label}</button>;\n}`,
      errors: [{ messageId: "noDestructure" }],
    },
    {
      code: `const Btn = ({ a, b, ...others }) => <div {...others}>{a}{b}</div>;`,
      output: `import { omit } from "solid-js";\nconst Btn = (props) => {\n  const others = omit(props, "a", "b");\n  return (<div {...others}>{props.a}{props.b}</div>);\n};`,
      errors: [{ messageId: "noDestructure" }],
    },
    // Defaults: report only. merge() treats an explicit undefined as a value, unlike a destructuring default.
    {
      code: `const C = ({ size = "m" }) => <b>{size}</b>;`,
      output: null,
      errors: [{ messageId: "noDestructureDefaults" }],
    },
    {
      code: `const C = ({ size = "m", ...rest }) => <b {...rest}>{size}</b>;`,
      output: null,
      errors: [{ messageId: "noDestructureDefaults" }],
    },
  ].map((c) => ({ ...c, settings })),
});
