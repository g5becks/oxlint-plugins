import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// TASK-049: prefer-classlist is retired at settings.solidjs.version 2. classList is removed in 2.0
// (MIGRATION §classList → class (object/array forms); RFC 07 §Enhanced class prop), so the rule
// reports nothing there; no-classlist suggests the class forms instead.
const rule = ruleOf(plugin, "prefer-classlist");
const tester = ruleTester("tsx");
const CODE = `import { cn } from "./cn"; const A = (p) => <div class={cn({ active: p.on })} />;`;

tester.run("prefer-classlist (version 2: retired)", rule, {
  valid: [{ code: CODE, settings: { solidjs: { version: 2 } } }],
  invalid: [
    // Version 1 is unchanged.
    {
      code: CODE,
      output: `import { cn } from "./cn"; const A = (p) => <div classlist={{ active: p.on }} />;`,
      errors: 1,
    },
  ],
});
