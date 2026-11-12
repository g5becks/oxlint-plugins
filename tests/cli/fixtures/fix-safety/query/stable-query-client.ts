// Fix-safety fixture: React imported, so the rule autofixes with the imported useState.
import { QueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function App() {
  const queryClient = new QueryClient();
  return queryClient;
}

export function useCustomSetup() {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 } },
  });
  return client;
}

export const keep = useState;
