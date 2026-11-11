export const pathAsFirstArgFunctions = [
  "createFileRoute",
  "createLazyFileRoute",
  "createLazyRoute",
] as const;

export const pathAsPropertyFunctions = ["createRoute"] as const;

export const allRouteFunctions = [...pathAsFirstArgFunctions, ...pathAsPropertyFunctions] as const;

export const VALID_PARAM_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export const createRouteFunctionsIndirect = ["createFileRoute", "createRootRouteWithContext"] as const;

export const createRouteFunctionsDirect = ["createRootRoute", "createRoute"] as const;

export const createRouteFunctions = [...createRouteFunctionsDirect, ...createRouteFunctionsIndirect] as const;

export const sortRules = [
  [["params", "validateSearch"], ["search"]],
  [["search"], ["loaderDeps", "ssr"]],
  [["loaderDeps"], ["context"]],
  [["context"], ["beforeLoad"]],
  [["beforeLoad"], ["loader"]],
  [["loader"], ["onEnter", "onStay", "onLeave", "head", "scripts", "headers", "remountDeps"]],
] as const;
