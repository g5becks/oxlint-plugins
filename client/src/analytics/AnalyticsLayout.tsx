import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs'
import { Link, Outlet, useLocation } from '@tanstack/solid-router'

export default function AnalyticsLayout() {
  const location = useLocation()
  const currentPath = () => location().pathname

  return (
    <div class="flex flex-col h-full">
      <div class="border-b border-border bg-sidebar px-4 sm:px-6">
        <Tabs value={currentPath()}>
          <TabsList class="w-full justify-start overflow-x-auto">
            <TabsTrigger value="/analytics/pnl" as={Link} href="/analytics/pnl">
              P&L Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="/analytics/performance"
              as={Link}
              href="/analytics/performance"
            >
              Performance
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div class="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
