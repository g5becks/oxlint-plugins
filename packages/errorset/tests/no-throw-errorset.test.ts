import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-throw-errorset");

const tester = ruleTester("tsx");

const IMPORT = `import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();`;

tester.run("no-throw-errorset", rule, {
  valid: [
    // No errorset import — ignore
    {
      code: `function f() { throw new Error("boom"); }`,
    },
    // Correct usage: return instead of throw
    {
      code: `${IMPORT}
function getUser(id) {
  return UserError.not_found\`User \${"id"} not found\`({ id });
}`,
    },
    // Throw inside .capture() target function is allowed
    {
      code: `${IMPORT}
UserError.capture(() => {
  throw new Error("network");
}, (e) => UserError.invalid\`Error\`);`,
    },
    // Throw of a non-errorset value
    {
      code: `${IMPORT}
function getUser(id) {
  throw new Error("generic");
}`,
    },
  ],
  invalid: [
    // Direct throws in a function body: reported, no autofix, a `return` suggestion.
    // Pattern A: throw SomeError.kind`...`(data)
    {
      code: `${IMPORT}
function getUser(id) {
  throw UserError.not_found\`User \${"id"} not found\`({ id });
}`,
      output: null,
      errors: [
        {
          messageId: "noThrow",
          suggestions: [
            {
              messageId: "suggestReturn",
              output: `${IMPORT}
function getUser(id) {
  return UserError.not_found\`User \${"id"} not found\`({ id });
}`,
            },
          ],
        },
      ],
    },
    // Pattern B: throw SomeError.kind`...` (zero-arg callable)
    {
      code: `${IMPORT}
function getUser() {
  throw UserError.invalid\`Invalid input\`;
}`,
      output: null,
      errors: [
        {
          messageId: "noThrow",
          suggestions: [
            {
              messageId: "suggestReturn",
              output: `${IMPORT}
function getUser() {
  return UserError.invalid\`Invalid input\`;
}`,
            },
          ],
        },
      ],
    },
    // Arrow function assigned to a variable (not a callback)
    {
      code: `${IMPORT}
const getUser = (id) => { throw UserError.not_found\`User \${"id"}\`({ id }); }`,
      output: null,
      errors: [
        {
          messageId: "noThrow",
          suggestions: [
            {
              messageId: "suggestReturn",
              output: `${IMPORT}
const getUser = (id) => { return UserError.not_found\`User \${"id"}\`({ id }); }`,
            },
          ],
        },
      ],
    },
    // Inside if / else blocks of the function body: still direct, suggested
    {
      code: `${IMPORT}
function getUser(id) {
  if (!id) { throw UserError.invalid\`missing id\`; }
  return id;
}`,
      output: null,
      errors: [
        {
          messageId: "noThrow",
          suggestions: [
            {
              messageId: "suggestReturn",
              output: `${IMPORT}
function getUser(id) {
  if (!id) { return UserError.invalid\`missing id\`; }
  return id;
}`,
            },
          ],
        },
      ],
    },
    // Audit R3: a `return` would change behavior here, so no suggestion.
    // Callback passed to .map: return would put the error into the array
    {
      code: `${IMPORT}
function all(ids) {
  return ids.map((id) => {
    if (!id) throw UserError.not_found\`missing\`({ id });
    return id;
  });
}`,
      output: null,
      errors: [{ messageId: "noThrow", suggestions: [] }],
    },
    // try / finally
    {
      code: `${IMPORT}
function f(cleanup) {
  try {
    throw UserError.invalid\`bad\`;
  } finally {
    cleanup();
  }
}`,
      output: null,
      errors: [{ messageId: "noThrow", suggestions: [] }],
    },
    // catch block
    {
      code: `${IMPORT}
function f(run) {
  try { run(); } catch (e) { throw UserError.invalid\`bad\`; }
}`,
      output: null,
      errors: [{ messageId: "noThrow", suggestions: [] }],
    },
    // for loop
    {
      code: `${IMPORT}
function f(ids) {
  for (const id of ids) { if (!id) throw UserError.invalid\`bad\`; }
  return ids;
}`,
      output: null,
      errors: [{ messageId: "noThrow", suggestions: [] }],
    },
    // while loop
    {
      code: `${IMPORT}
function f(next) {
  while (next()) { throw UserError.invalid\`bad\`; }
}`,
      output: null,
      errors: [{ messageId: "noThrow", suggestions: [] }],
    },
    // switch
    {
      code: `${IMPORT}
function f(kind) {
  switch (kind) {
    case "a":
      throw UserError.invalid\`bad\`;
  }
  return kind;
}`,
      output: null,
      errors: [{ messageId: "noThrow", suggestions: [] }],
    },
  ],
});
