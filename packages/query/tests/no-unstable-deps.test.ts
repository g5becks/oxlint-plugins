import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-unstable-deps");

const tester = ruleTester("tsx");

tester.run("no-unstable-deps", rule, {
  valid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; import React, { useEffect } from 'React'; const { data } = useQuery({ queryKey: ['x'], queryFn: () => 1 }); useEffect(() => {}, [data]);",
    },
  ],
  invalid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; import React, { useEffect } from 'React'; const query = useQuery({ queryKey: ['x'], queryFn: () => 1 }); useEffect(() => {}, [query]);",
      errors: [{ messageId: "noUnstableDeps" }],
    },
  ],
});
