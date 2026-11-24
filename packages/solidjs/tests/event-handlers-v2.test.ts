import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-052: event-handlers at settings.solidjs.version 2. Only `on` + an uppercase letter is an event
// handler; a lowercase on* is an attribute (MIGRATION §Attributes & events; RFC 07; RFC 08
// §LOWERCASE_EVENT_ATTRIBUTE).
const rule = ruleOf(plugin, "event-handlers");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };

tester.run("event-handlers (version 2)", rule, {
  valid: [
    `const A = () => <button onClick={increment} />;`,
    // A string on a lowercase on* is the HTML inline-handler attribute.
    `const A = () => <link rel="preload" onload="this.rel='stylesheet'" />;`,
    // Components: on* are ordinary props.
    `const A = () => <Button onclick={() => go()} />;`,
    // ignoreCase silences the ambiguous case, not a definite function.
    { code: `const A = (p) => <div onclick={p.handler} />;`, options: [{ ignoreCase: true }] },
  ].map((c) => (typeof c === "string" ? { code: c, settings } : { ...c, settings })),
  invalid: [
    // The guide's example: a function on a lowercase on* (autofix for known events).
    {
      code: `function increment() {}\nconst A = () => <button onclick={increment} />;`,
      output: `function increment() {}\nconst A = () => <button onClick={increment} />;`,
      errors: [{ messageId: "lowercase-handler" }],
    },
    {
      code: `const A = () => <div onmouseover={() => hover()} />;`,
      output: `const A = () => <div onMouseOver={() => hover()} />;`,
      errors: [{ messageId: "lowercase-handler" }],
    },
    {
      code: `const go = () => {};\nconst A = () => <div ondoubleclick={go} />;`,
      output: `const go = () => {};\nconst A = () => <div onDblClick={go} />;`,
      errors: [{ messageId: "lowercase-handler" }],
    },
    // An unknown event name: suggestion only.
    {
      code: `const A = () => <my-el onfoo={() => x()} />;`,
      output: null,
      errors: [
        {
          messageId: "lowercase-handler",
          suggestions: [{ messageId: "make-handler", output: `const A = () => <my-el onFoo={() => x()} />;` }],
        },
      ],
    },
    // A dynamic value of unknown type: maybe a function.
    {
      code: `const A = (p) => <div onclick={p.handler} />;`,
      output: null,
      errors: [
        {
          messageId: "lowercase-ambiguous",
          suggestions: [{ messageId: "make-handler", output: `const A = (p) => <div onClick={p.handler} />;` }],
        },
      ],
    },
    // A static string on a camelCase handler: the inline-handler attribute is lowercase.
    { code: `const A = () => <button onClick="go()" />;`, output: null, errors: [{ messageId: "detected-attr-v2" }] },
    // Through a spread the same rule applies (RFC 08 §LOWERCASE_EVENT_ATTRIBUTE).
    {
      code: `const A = () => <div {...{ onclick: () => go() }} />;`,
      output: `const A = () => <div {...{ onClick: () => go() }} />;`,
      errors: [{ messageId: "lowercase-handler" }],
    },
    // Capitalization fixes still apply.
    {
      code: `const A = () => <div onDblclick={() => go()} />;`,
      output: `const A = () => <div onDblClick={() => go()} />;`,
      errors: [{ messageId: "capitalization" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("event-handlers (version 1 controls)", rule, {
  valid: [`const A = () => <link onLoad={() => x()} />;`],
  invalid: [
    {
      code: `const A = () => <div onclick={() => go()} />;`,
      output: `const A = () => <div onClick={() => go()} />;`,
      errors: [{ messageId: "capitalization" }],
    },
  ],
});
