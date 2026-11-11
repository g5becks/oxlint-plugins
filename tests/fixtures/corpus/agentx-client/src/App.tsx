import { router } from '#router'
import { ThemeProvider } from '#stores/theme-store'
import { MetaProvider, Title } from '@solidjs/meta'
import { TanStackDevtools } from '@tanstack/solid-devtools'
import { formDevtoolsPlugin } from '@tanstack/solid-form-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'
import { RouterProvider } from '@tanstack/solid-router'
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 3,
      retryDelay: (i: number) => Math.min(1000 * 2 ** i, 30_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

const App = () => (
  <MetaProvider>
    <Title>Agent X - Trading Platform</Title>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        {import.meta.env.DEV && (
          <>
            <SolidQueryDevtools initialIsOpen={false} />
            <TanStackRouterDevtools initialIsOpen={false} router={router} />
          </>
        )}
      </ThemeProvider>
      {import.meta.env.DEV && (
        <TanStackDevtools plugins={[formDevtoolsPlugin()]} />
      )}
    </QueryClientProvider>
  </MetaProvider>
)

export default App
