export const infiniteQueryFunctions = [
  "infiniteQueryOptions",
  "useInfiniteQuery",
  "useSuspenseInfiniteQuery",
] as const;

export const infiniteQueryCheckedProperties = [
  "queryFn",
  "getPreviousPageParam",
  "getNextPageParam",
] as const;

export const infiniteQuerySortRules = [
  [["queryFn"], ["getPreviousPageParam", "getNextPageParam"]],
] as const;

export const mutationFunctions = ["useMutation"] as const;

export const mutationCheckedProperties = [
  "onMutate",
  "onError",
  "onSettled",
] as const;

export const mutationSortRules = [[ ["onMutate"], ["onError", "onSettled"] ]] as const;

export const queryHooks = [
  "useQuery",
  "useQueries",
  "useInfiniteQuery",
  "useSuspenseQuery",
  "useSuspenseQueries",
  "useSuspenseInfiniteQuery",
] as const;
