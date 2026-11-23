import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-051: no-unknown-namespaces at settings.solidjs.version 2. MIGRATION §Attributes & events;
// RFC 07 §Follow HTML standards by default, §Directives via ref, §Removals.
const rule = ruleOf(plugin, "no-unknown-namespaces");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };
const s = (messageId: string, output: string) => ({ messageId, output });

tester.run("no-unknown-namespaces (version 2)", rule, {
  valid: [
    `const A = () => <input prop:value={v()} />;`,
    `const A = () => <svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#a" /></svg>;`,
    `const A = () => <svg xml:lang="en" />;`,
    { code: `const A = () => <div my:thing="x" />;`, options: [{ allowedNamespaces: ["my"] }] },
  ].map((c) => (typeof c === "string" ? { code: c, settings } : { ...c, settings })),
  invalid: [
    {
      code: `const A = () => <button on:click={save} />;`,
      errors: [
        { messageId: "removedOn", suggestions: [s("suggestReplace", `const A = () => <button onClick={save} />;`)] },
      ],
    },
    {
      code: `const A = () => <div on:pointerdown={down} />;`,
      errors: [
        { messageId: "removedOn", suggestions: [s("suggestReplace", `const A = () => <div onPointerDown={down} />;`)] },
      ],
    },
    { code: `const A = () => <button oncapture:click={log} />;`, errors: [{ messageId: "removedOn" }] },
    {
      code: `const A = () => <some-element attr:enabled="true" />;`,
      errors: [
        {
          messageId: "removedAttr",
          suggestions: [s("suggestReplace", `const A = () => <some-element enabled="true" />;`)],
        },
      ],
    },
    {
      code: `const A = () => <video bool:muted={m()} />;`,
      errors: [
        { messageId: "removedAttr", suggestions: [s("suggestReplace", `const A = () => <video muted={m()} />;`)] },
      ],
    },
    // RFC 07 §Directives via ref: use:x={v} → ref={x(v)}; use:x → ref={x}.
    {
      code: `const A = () => <button use:tooltip={{ content: "Save" }} />;`,
      errors: [
        {
          messageId: "removedUse",
          suggestions: [s("suggestReplace", `const A = () => <button ref={tooltip({ content: "Save" })} />;`)],
        },
      ],
    },
    {
      code: `const A = () => <input use:autofocus />;`,
      errors: [
        { messageId: "removedUse", suggestions: [s("suggestReplace", `const A = () => <input ref={autofocus} />;`)] },
      ],
    },
    // With an existing ref there's no single-attribute replacement (an array composes them).
    { code: `let el; const A = () => <input ref={el} use:autofocus />;`, errors: [{ messageId: "removedUse" }] },
    { code: `const A = () => <div class:active={on()} />;`, errors: [{ messageId: "style" }] },
    { code: `const A = () => <div foo:bar="1" />;`, errors: [{ messageId: "unknownV2" }] },
    // Components keep the version-1 handling.
    {
      code: `const A = () => <Comp on:click={f} />;`,
      errors: [
        { messageId: "component", suggestions: [s("component-suggest", `const A = () => <Comp click={f} />;`)] },
      ],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("no-unknown-namespaces (version 1 controls)", rule, {
  valid: [`const A = () => <button on:click={save} use:tooltip attr:x="1" />;`],
  invalid: [{ code: `const A = () => <svg xml:lang="en" />;`, errors: [{ messageId: "unknown" }] }],
});
