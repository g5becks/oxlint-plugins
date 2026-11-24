import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-056: no-cleanup-in-ref (settings.solidjs.version 2 only). MIGRATION §Ref callbacks: no longer
// owned; RFC 07 §Two-phase directive factories; RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE, §NO_OWNER_EFFECT.
const rule = ruleOf(plugin, "no-cleanup-in-ref");
const tester = ruleTester("tsx");
const settings = { solidjs: { version: 2 } };
const I = `import { onCleanup, getOwner, createEffect, createSignal, onSettled } from "solid-js";\n`;

tester.run("no-cleanup-in-ref", rule, {
  valid: [
    // MIGRATION §Ref callbacks: onSettled in the component body.
    `${I}function C() { let el; onSettled(() => { el.addEventListener("pointerdown", onDown); return () => el.removeEventListener("pointerdown", onDown); }); return <div ref={el} />; }`,
    // RFC 07: a directive factory owns its cleanup; the returned callback only captures the element.
    `${I}function tooltip(o) { let el; onCleanup(() => destroy()); return (next) => { el = next; attach(next); }; }\nconst A = () => <button ref={tooltip({ content: "Save" })} />;`,
    `${I}const A = () => <div ref={(el) => { el.focus(); }} />;`,
    // A function that runs later is fine.
    `${I}const A = () => <div ref={(el) => { el.onclick = () => onCleanup(stop); }} />;`,
    // Not Solid's.
    `import { onCleanup } from "other"; const A = () => <div ref={(el) => onCleanup(() => el)} />;`,
  ].map((code) => ({ code, settings })),
  invalid: [
    // MIGRATION §Ref callbacks: the 1.x pattern.
    {
      code: `${I}const A = () => <div ref={(el) => { el.addEventListener("pointerdown", onDown); onCleanup(() => el.removeEventListener("pointerdown", onDown)); }} />;`,
      errors: [{ messageId: "cleanupInRef" }],
    },
    // RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE: the expression-bodied form.
    {
      code: `${I}const A = () => <div ref={(el) => onCleanup(() => detach(el))} />;`,
      errors: [{ messageId: "cleanupInRef" }],
    },
    // Inside a ref array (RFC 07: arrays compose callbacks).
    {
      code: `${I}const A = () => <div ref={[autofocus, (el) => { onCleanup(() => detach(el)); }]} />;`,
      errors: [{ messageId: "cleanupInRef" }],
    },
    {
      code: `${I}const A = () => <div ref={(el) => { const o = getOwner(); keep(o, el); }} />;`,
      errors: [{ messageId: "getOwnerInRef" }],
    },
    // Primitives and onSettled have no owner here.
    {
      code: `${I}const A = () => <div ref={(el) => { createEffect(() => x(), (v) => { el.title = v; }); }} />;`,
      errors: [{ messageId: "primitiveInRef" }],
    },
    {
      code: `${I}const A = () => <div ref={(el) => { onSettled(() => measure(el)); }} />;`,
      errors: [{ messageId: "primitiveInRef" }],
    },
    // On components too (the ref is forwarded).
    {
      code: `${I}const A = () => <Field ref={(el) => onCleanup(() => el)} />;`,
      errors: [{ messageId: "cleanupInRef" }],
    },
  ].map((c) => ({ ...c, settings })),
});

tester.run("no-cleanup-in-ref (version 1)", rule, {
  valid: [`${I}const A = () => <div ref={(el) => onCleanup(() => detach(el))} />;`],
  invalid: [],
});
