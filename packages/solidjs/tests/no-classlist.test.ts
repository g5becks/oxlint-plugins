import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-050: no-classlist (settings.solidjs.version 2 only). MIGRATION §classList → class
// (object/array forms); RFC 07 §Enhanced class prop.
const rule = ruleOf(plugin, "no-classlist");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("no-classlist", rule, {
  valid: [
    `const A = () => <div class={["card", { active: isActive() }]} />;`,
    // On components classList is an ordinary prop (MIGRATION §Attributes & events).
    `const A = () => <Card classList={{ active: true }} />;`,
  ].map((code) => ({ code, settings })),
  invalid: [
    // The guide's example.
    {
      code: `const A = () => <div class="card" classList={{ active: isActive(), disabled: isDisabled() }} />;`,
      output: `const A = () => <div class={["card", { active: isActive(), disabled: isDisabled() }]} />;`,
      errors: [{ messageId: "noClasslist" }],
    },
    {
      code: `const A = () => <div classList={{ active: on() }}>x</div>;`,
      output: `const A = () => <div class={{ active: on() }}>x</div>;`,
      errors: [{ messageId: "noClasslist" }],
    },
    {
      code: `const A = (props) => <div classList={{ active: props.on }} class={props.class} />;`,
      output: `const A = (props) => <div class={[props.class, { active: props.on }]} />;`,
      errors: [{ messageId: "noClasslist" }],
    },
    {
      code: `const A = () => <div class={["a", b()]} classList={flags()} />;`,
      output: `const A = () => <div class={["a", b(), flags()]} />;`,
      errors: [{ messageId: "noClasslist" }],
    },
    // JSX attribute strings aren't JS strings: the value is re-quoted safely.
    {
      code: `const A = () => <div class='a "b"' classList={{ c: true }} />;`,
      output: `const A = () => <div class={["a \\"b\\"", { c: true }]} />;`,
      errors: [{ messageId: "noClasslist" }],
    },
    {
      code: `const A = () => <div classlist={{ active: true }} />;`,
      output: `const A = () => <div class={{ active: true }} />;`,
      errors: [{ messageId: "noClasslist" }],
    },
    // No fix: a spread may carry a class; two classList props; a bare class.
    {
      code: `const A = (p) => <div {...p} classList={{ a: true }} />;`,
      output: null,
      errors: [{ messageId: "noClasslist" }],
    },
    {
      code: `const A = () => <div classList={{ a: true }} classList={{ b: true }} />;`,
      output: null,
      errors: [{ messageId: "noClasslist" }, { messageId: "noClasslist" }],
    },
    {
      code: `const A = () => <div class classList={{ a: true }} />;`,
      output: null,
      errors: [{ messageId: "noClasslist" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("no-classlist (version 1)", rule, {
  valid: [`const A = () => <div classList={{ active: true }} />;`],
  invalid: [],
});
