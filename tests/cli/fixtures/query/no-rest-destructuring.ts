import { useQuery, useMutation } from "@tanstack/react-query";

// ── VALID ──────────────────────────────────────────────
function ValidDestructure() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users"),
  });
  return { data, isLoading };
}

// ── INVALID ────────────────────────────────────────────

// 1) rest destructuring from useQuery
function RestQuery() {
  const { data, ...rest } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users"),
  });
  return { data, rest };
}

// 2) rest destructuring from useMutation
function RestMutation() {
  const { mutate, ...rest } = useMutation({
    mutationFn: (data: any) => fetch("/api/update", { method: "POST", body: JSON.stringify(data) }),
  });
  return { mutate, rest };
}

// 3) rest from intermediate variable
function RestIntermediate() {
  const queryResult = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts"),
  });
  const { data, ...rest } = queryResult;
  return { data, rest };
}
