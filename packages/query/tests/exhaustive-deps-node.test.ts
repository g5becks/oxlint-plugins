import { RuleTester, ruleOf } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// Audit R12: exhaustive-deps reports on the same node as upstream @tanstack/eslint-plugin-query
// 5.107.1 (the useQuery options object), so editor squiggles and disable-next-line placement
// match. Expected location measured by running upstream 5.107.1 in ESLint 9.39.5 on this code:
// line 3, column 22 to line 6, column 4 (ESLint 1-based columns, hence eslintCompat).
const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { sourceType: "module", parserOptions: { lang: "tsx" } },
});

const code = `import { useQuery } from '@tanstack/react-query'
function Component({ id }: { id: number }) {
  const q = useQuery({
    queryKey: ['entity'],
    queryFn: () => fetch('/api/' + id),
  })
  return q
}
`;

tester.run("exhaustive-deps report node (audit R12)", ruleOf(plugin, "exhaustive-deps"), {
  valid: [],
  invalid: [
    {
      code,
      errors: [
        {
          messageId: "missingDeps",
          line: 3,
          column: 22,
          endLine: 6,
          endColumn: 4,
          suggestions: [
            {
              messageId: "fixTo",
              output: code.replace("queryKey: ['entity'],", "queryKey: ['entity', id],"),
            },
          ],
        },
      ],
    },
  ],
});
