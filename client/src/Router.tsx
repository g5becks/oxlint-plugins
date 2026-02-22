import { AlertsPage } from '#alerts/AlertsPage'
import AnalyticsLayout from '#analytics/AnalyticsLayout'
import PerformancePage from '#analytics/PerformancePage'
import PnlPage from '#analytics/PnlPage'
import { AppSidebar } from '#components/layout/app-sidebar'
import { CommandMenu } from '#components/layout/command-menu'
import { TopHeader } from '#components/layout/top-header'
import {
  SidebarInset,
  SidebarProvider,
} from '#components/ui/sidebar'
import { HistoryPage } from '#history/HistoryPage'
import { NewsPage } from '#news/NewsPage'
import { AppearancePage } from '#settings/AppearancePage'
import { BackupPage } from '#settings/BackupPage'
import { BrokersPage } from '#settings/BrokersPage'
import { NotificationsPage } from '#settings/NotificationsPage'
import { SecurityPage } from '#settings/SecurityPage'
import { SettingsLayout } from '#settings/SettingsLayout'
import { StrategiesPage } from '#strategies/StrategiesPage'
import { WatchlistPage } from '#watchlist/WatchlistPage'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/solid-router'
import { createSignal } from 'solid-js'

// ---------------------------------------------------------------------------
// RootLayout — application shell
// ---------------------------------------------------------------------------

const RootLayout = () => {
  const [commandMenuOpen, setCommandMenuOpen] = createSignal(false)

  return (
    <SidebarProvider>
      <AppSidebar onSearchClick={() => setCommandMenuOpen(true)} />
      <SidebarInset>
        <TopHeader onSearchClick={() => setCommandMenuOpen(true)} />
        <div class="flex-1 overflow-auto p-4">
          <div class="animate-fade-in">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
      <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />
    </SidebarProvider>
  )
}

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/history" />,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryPage,
})

const strategiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/strategies',
  component: StrategiesPage,
})

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/alerts',
  component: AlertsPage,
})

const watchlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watchlist',
  component: WatchlistPage,
})

const newsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/news',
  component: NewsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsLayout,
})

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: () => <Navigate to="/settings/notifications" />,
})

const notificationsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/notifications',
  component: NotificationsPage,
})

const brokersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/brokers',
  component: BrokersPage,
})

const appearanceRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/appearance',
  component: AppearancePage,
})

const backupRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/backup',
  component: BackupPage,
})

const securityRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/security',
  component: SecurityPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsLayout,
})

const analyticsIndexRoute = createRoute({
  getParentRoute: () => analyticsRoute,
  path: '/',
  component: () => <Navigate to="/analytics/pnl" />,
})

const pnlRoute = createRoute({
  getParentRoute: () => analyticsRoute,
  path: '/pnl',
  component: PnlPage,
})

const performanceRoute = createRoute({
  getParentRoute: () => analyticsRoute,
  path: '/performance',
  component: PerformancePage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  historyRoute,
  strategiesRoute,
  alertsRoute,
  watchlistRoute,
  newsRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    notificationsRoute,
    brokersRoute,
    appearanceRoute,
    backupRoute,
    securityRoute,
  ]),
  analyticsRoute.addChildren([
    analyticsIndexRoute,
    pnlRoute,
    performanceRoute,
  ]),
])

// ---------------------------------------------------------------------------
// Router instance
// ---------------------------------------------------------------------------

export const router = createRouter({ routeTree })

declare module '@tanstack/solid-router' {
  // eslint-disable-next-line ts/consistent-type-definitions, functional/type-declaration-immutability
  interface Register {
    router: typeof router
  }
}
