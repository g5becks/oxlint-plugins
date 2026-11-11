import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "route-param-names");

const tester = ruleTester("tsx");

tester.run("route-param-names", rule, {
  valid: [
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$userId')({ component: Users });",
    },
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ path: '/posts/{$postId}' });",
    },
    // Optional and braced params, splats, several params, solid-router, other path functions.
    { code: "import { createFileRoute } from '@tanstack/solid-router'; createFileRoute('/users/{-$tab}')({});" },
    { code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/files/$')({});" },
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/a/$a_1/b/{$b$}/c/prefix{$c}.json')({});",
    },
    {
      code: "import { createLazyFileRoute } from '@tanstack/react-router'; createLazyFileRoute('/users/$userId')({});",
    },
    { code: "import { createRoute } from '@tanstack/react-router'; createRoute({ path: `/posts/$postId` });" },
    // Not a TanStack Router import: ignored.
    { code: "import { createFileRoute } from 'other-router'; createFileRoute('/users/$123bad')({});" },
    // Dynamic paths can't be checked.
    { code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute(somePath)({});" },
  ],
  invalid: [
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$123bad')({ component: Users });",
      errors: [{ messageId: "invalidParamName" }],
    },
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$user-id')({});",
      errors: [{ messageId: "invalidParamName", data: { paramName: "user-id" } }],
    },
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ path: '/posts/{$post.id}' });",
      errors: [{ messageId: "invalidParamName", data: { paramName: "post.id" } }],
    },
    {
      code: "import { createFileRoute } from '@tanstack/solid-router'; createFileRoute('/users/{-$1tab}')({});",
      errors: [{ messageId: "invalidParamName", data: { paramName: "1tab" } }],
    },
    {
      code: "import { createLazyFileRoute } from '@tanstack/react-router'; createLazyFileRoute('/a/$ok/$9bad/$also-bad')({});",
      errors: [
        { messageId: "invalidParamName", data: { paramName: "9bad" } },
        { messageId: "invalidParamName", data: { paramName: "also-bad" } },
      ],
    },
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ path: `/x/$a b` });",
      errors: [{ messageId: "invalidParamName", data: { paramName: "a b" } }],
    },
  ],
});
