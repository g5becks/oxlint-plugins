import type { Component } from 'solid-js'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#components/ui/breadcrumb'
import { Separator } from '#components/ui/separator'
import { SidebarTrigger } from '#components/ui/sidebar'
import { useAuth } from '#utils/auth-store'
import { useLocation } from '@tanstack/solid-router'
import { TbOutlineSearch } from 'solid-icons/tb'
import { createMemo, Show } from 'solid-js'

type TopHeaderProps = {
  /** Callback when search/Cmd+K button is clicked */
  onSearchClick?: () => void
}

type BreadcrumbInfo = {
  parent: string
  current: string
}

const pageTitles: Record<string, string> = {
  '/history': 'History',
  '/strategies': 'Strategies',
  '/alerts': 'Alerts',
  '/watchlist': 'Watchlist',
  '/news': 'News',
  '/settings/notifications': 'Notifications',
  '/settings/brokers': 'Brokers',
  '/settings/appearance': 'Appearance',
  '/settings/backup': 'Backup & Restore',
  '/settings/security': 'Security',
  '/analytics/pnl': 'P&L',
  '/analytics/performance': 'Performance',
}

const getBreadcrumb = (pathname: string): BreadcrumbInfo | null => {
  if (pathname.startsWith('/settings/')) {
    return {
      parent: 'Settings',
      current: pageTitles[pathname] ?? 'Settings',
    }
  }
  if (pathname.startsWith('/analytics/')) {
    return {
      parent: 'Analytics',
      current: pageTitles[pathname] ?? 'Analytics',
    }
  }
  return null
}

const getUserInitials = (name?: string, email?: string): string => {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      const first = parts[0]?.[0]
      const last = parts[parts.length - 1]?.[0]
      if (first && last) {
        return `${first}${last}`.toUpperCase()
      }
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'U'
}

export const TopHeader: Component<TopHeaderProps> = (props) => {
  const location = useLocation()
  const { user } = useAuth()

  const breadcrumb = createMemo(() => {
    const pathname = location().pathname
    return getBreadcrumb(pathname)
  })

  const pageTitle = createMemo(() => {
    const pathname = location().pathname
    return pageTitles[pathname] ?? 'AgentX'
  })

  const userInitials = createMemo(() => {
    const currentUser = user()
    return getUserInitials(currentUser?.name, currentUser?.email)
  })

  return (
    <header class="flex h-12 shrink-0 items-center gap-2 border-b px-4 pt-[env(safe-area-inset-top)]">
      {/* Left: Sidebar trigger + Breadcrumb/Title */}
      <div class="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" class="h-4" />
        <Show
          when={breadcrumb()}
          fallback={<span class="font-medium">{pageTitle()}</span>}
        >
          {crumb => (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span class="text-sm text-muted-foreground">{crumb().parent}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{crumb().current}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </Show>
      </div>

      {/* Right: Search badge + User avatar */}
      <div class="ml-auto flex items-center gap-3">
        {/* Search trigger with Cmd+K badge */}
        <button
          type="button"
          onClick={() => props.onSearchClick?.()}
          class="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <TbOutlineSearch class="size-4 shrink-0" />
          <span class="hidden sm:inline">Search...</span>
          <kbd class="hidden rounded border bg-muted px-1.5 py-0.5 text-xs font-mono tabular-nums sm:inline-block">
            ⌘K
          </kbd>
        </button>

        {/* User avatar */}
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white transition-opacity hover:opacity-90"
          title={user()?.name ?? user()?.email ?? 'User'}
        >
          {userInitials()}
        </button>
      </div>
    </header>
  )
}
