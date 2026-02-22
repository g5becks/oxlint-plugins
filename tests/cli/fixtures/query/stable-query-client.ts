import { QueryClient } from "@tanstack/react-query";

// ── VALID ──────────────────────────────────────────────
const stableClient = new QueryClient();

// ── INVALID ────────────────────────────────────────────

// 1) QueryClient inside component
function App() {
  const queryClient = new QueryClient();
  return queryClient;
}

// 2) QueryClient inside custom hook
function useCustomSetup() {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 } },
  });
  return client;
}
