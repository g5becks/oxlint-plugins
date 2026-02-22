import { QueryClient, useQuery, useInfiniteQuery, useMutation } from "@tanstack/react-query";

// Stable QueryClient — outside component
const queryClient = new QueryClient();

// Proper destructuring (no rest)
function App() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users"),
  });

  // Correct infinite query property order: queryFn before getNextPageParam
  const infiniteResult = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam }) => fetch(`/api/posts?page=${pageParam}`),
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
  });

  // Correct mutation property order: onMutate before onError/onSettled
  const mutation = useMutation({
    mutationFn: (data: any) => fetch("/api/users", { method: "POST", body: JSON.stringify(data) }),
    onMutate: (variables: any) => console.log("mutating", variables),
    onError: (error: any) => console.error(error),
    onSettled: () => console.log("done"),
  });

  return null;
}
