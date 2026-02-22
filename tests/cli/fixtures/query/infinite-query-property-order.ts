import { useInfiniteQuery } from "@tanstack/react-query";

// ── VALID ──────────────────────────────────────────────
function ValidInfinite() {
  return useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam }) => fetch(`/api/posts?page=${pageParam}`),
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    initialPageParam: 0,
  });
}

// ── INVALID ────────────────────────────────────────────

// 1) getNextPageParam before queryFn
function BadOrder1() {
  return useInfiniteQuery({
    queryKey: ["posts"],
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    queryFn: ({ pageParam }) => fetch(`/api/posts?page=${pageParam}`),
    initialPageParam: 0,
  });
}

// 2) getPreviousPageParam before queryFn
function BadOrder2() {
  return useInfiniteQuery({
    queryKey: ["items"],
    getPreviousPageParam: (firstPage: any) => firstPage.prevCursor,
    queryFn: ({ pageParam }) => fetch(`/api/items?page=${pageParam}`),
    initialPageParam: 0,
  });
}
