import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-catch-errorset");

const tester = ruleTester("tsx");

const IMPORT = `import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "suspended"]).init();`;

tester.run("no-catch-errorset", rule, {
  valid: [
    // No errorset import — ignore
    {
      code: `try { doSomething(); } catch (e) { if (e instanceof Error) {} }`,
    },
    // Using isErr outside a catch block is fine
    {
      code: `${IMPORT}
const result = getUser();
if (isErr(result)) { console.log(result.kind); }`,
    },
    // Guard call outside catch block
    {
      code: `${IMPORT}
const result = getUser();
if (UserError(result)) { console.log("error"); }`,
    },
    // instanceof outside catch
    {
      code: `${IMPORT}
const result = getUser();
const isUserError = result instanceof UserError;`,
    },
    // Valid catch that doesn't use errorset guards
    {
      code: `${IMPORT}
try { doSomething(); } catch (e) { console.error(e); }`,
    },
    // Nested function inside catch is exempt (new scope boundary)
    {
      code: `${IMPORT}
try { doSomething(); } catch (e) {
  const check = (val) => { if (UserError(val)) { console.log("ok"); } };
}`,
    },
  ],
  invalid: [
    // isErr() in catch — also reports e.kind inside the same block
    {
      code: `${IMPORT}
try { doSomething(); } catch (e) { if (isErr(e)) { console.log(e.kind); } }`,
      errors: [{ messageId: "isErrInCatch" }, { messageId: "kindInCatch" }],
    },
    // Set-level guard in catch
    {
      code: `${IMPORT}
try { doSomething(); } catch (e) { if (UserError(e)) { console.log("matched"); } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
    // instanceof in catch
    {
      code: `${IMPORT}
try { doSomething(); } catch (e) { if (e instanceof UserError) { console.log("matched"); } }`,
      errors: [{ messageId: "instanceofInCatch" }],
    },
    // .kind access on catch param
    {
      code: `${IMPORT}
try { doSomething(); } catch (e) { console.log(e.kind); }`,
      errors: [{ messageId: "kindInCatch" }],
    },
  ],
});
