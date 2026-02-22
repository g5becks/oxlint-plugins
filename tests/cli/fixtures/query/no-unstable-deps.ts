import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";

// ── VALID ──────────────────────────────────────────────
function ValidDeps() {
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users"),
  });

  useEffect(() => {
    console.log(data);
  }, [data]);

  return data;
}

// ── INVALID ────────────────────────────────────────────

// 1) query result in useEffect deps
function UnstableEffect() {
  const queryResult = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users"),
  });

  useEffect(() => {
    console.log(queryResult);
  }, [queryResult]);

  return queryResult.data;
}

// 2) mutation result in useCallback deps
function UnstableCallback() {
  const mutation = useMutation({
    mutationFn: (data: any) => fetch("/api/update", { method: "POST", body: JSON.stringify(data) }),
  });

  const callback = useCallback(() => {
    mutation.mutate({});
  }, [mutation]);

  return callback;
}
