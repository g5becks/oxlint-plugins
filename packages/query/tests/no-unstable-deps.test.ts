import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["no-unstable-deps"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("no-unstable-deps", rule as any, {
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
