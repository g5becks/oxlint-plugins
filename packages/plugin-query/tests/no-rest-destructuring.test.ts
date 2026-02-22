import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["no-rest-destructuring"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("no-rest-destructuring", rule as any, {
  valid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; const query = useQuery({ queryKey: ['x'], queryFn: () => 1 });",
    },
  ],
  invalid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; const { data, ...rest } = useQuery({ queryKey: ['x'], queryFn: () => 1 });",
      errors: [{ messageId: "objectRestDestructure" }],
    },
  ],
});
