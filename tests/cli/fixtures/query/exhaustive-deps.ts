import { useQuery } from "@tanstack/react-query";

// ── VALID ──────────────────────────────────────────────
function ValidComponent() {
  const userId = 123;
  const { data } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetch(`/api/users/${userId}`),
  });
  return data;
}

// ── INVALID ────────────────────────────────────────────

// 1) userId missing from queryKey
function MissingDep() {
  const userId = 123;
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetch(`/api/users/${userId}`),
  });
  return data;
}

// 2) both userId and status missing from queryKey
function MissingMultiple() {
  const userId = 456;
  const status = "active";
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetch(`/api/users/${userId}?status=${status}`),
  });
  return data;
}
