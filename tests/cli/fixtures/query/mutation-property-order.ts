import { useMutation } from "@tanstack/react-query";

// ── VALID ──────────────────────────────────────────────
function ValidMutation() {
  return useMutation({
    mutationFn: (data: any) => fetch("/api/update", { method: "POST", body: JSON.stringify(data) }),
    onMutate: (newData: any) => console.log("mutating", newData),
    onError: (error: any) => console.error(error),
    onSettled: () => console.log("settled"),
  });
}

// ── INVALID ────────────────────────────────────────────

// 1) onError before onMutate
function BadOrder1() {
  return useMutation({
    mutationFn: (data: any) => fetch("/api/update", { method: "POST", body: JSON.stringify(data) }),
    onError: (error: any) => console.error(error),
    onMutate: (newData: any) => console.log("mutating", newData),
  });
}

// 2) onSettled before onMutate
function BadOrder2() {
  return useMutation({
    mutationFn: (data: any) => fetch("/api/update", { method: "POST", body: JSON.stringify(data) }),
    onSettled: () => console.log("settled"),
    onMutate: (newData: any) => console.log("mutating", newData),
  });
}
