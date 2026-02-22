import { QueryClient, useQuery } from "@tanstack/react-query";

// Unstable QueryClient — inside component
function App() {
  const queryClient = new QueryClient();

  // Rest destructuring — leads to excessive re-renders
  const { data, ...rest } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users"),
  });

  return null;
}
