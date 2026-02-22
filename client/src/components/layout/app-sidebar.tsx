import type { IconTypes } from 'solid-icons'
import type { Component } from 'solid-js'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '#components/ui/sidebar'

import { Link, useLocation } from '@tanstack/solid-router'
import {
  TbOutlineBell,
  TbOutlineChevronRight,
  TbOutlineClock,
  TbOutlineEye,
  TbOutlineNews,
  TbOutlinePlus,
  TbOutlineSearch,
  TbOutlineStack2,
} from 'solid-icons/tb'
import { For } from 'solid-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MainNavItem = {
  title: string
  href: string
  icon: IconTypes
  /** Tailwind bg class for the colored icon badge */
  iconBg: string
  /** Tailwind text class for the icon color */
  iconColor: string
}

type SettingsNavItem = {
  title: string
  href: string
}

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

type AppSidebarProps = {
  /** Callback when Quick Find button is clicked */
  onSearchClick?: () => void
  /** Current connection status for the status dot indicator */
  connectionStatus?: ConnectionStatus
}

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

const mainNavItems: MainNavItem[] = [
  {
    title: 'History',
    href: '/history',
    icon: TbOutlineClock,
    iconBg: 'bg-blue-600',
    iconColor: 'text-white',
  },
  {
    title: 'Strategies',
    href: '/strategies',
    icon: TbOutlineStack2,
    iconBg: 'bg-purple-600',
    iconColor: 'text-white',
  },
  {
    title: 'Alerts',
    href: '/alerts',
    icon: TbOutlineBell,
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
  },
  {
    title: 'Watchlist',
    href: '/watchlist',
    icon: TbOutlineEye,
    iconBg: 'bg-emerald-500',
    iconColor: 'text-white',
  },
  {
    title: 'News',
    href: '/news',
    icon: TbOutlineNews,
    iconBg: 'bg-orange-600',
    iconColor: 'text-white',
  },
]

const settingsNavItems: SettingsNavItem[] = [
  { title: 'Notifications', href: '/settings/notifications' },
  { title: 'Brokers', href: '/settings/brokers' },
  { title: 'Appearance', href: '/settings/appearance' },
  { title: 'Backup & Restore', href: '/settings/backup' },
  { title: 'Security', href: '/settings/security' },
]

const analyticsNavItems: SettingsNavItem[] = [
  { title: 'P&L Dashboard', href: '/analytics/pnl' },
  { title: 'Performance', href: '/analytics/performance' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Main navigation item with a colorful rounded-square icon badge */
const MainNavLink: Component<{ item: MainNavItem }> = (props) => {
  const location = useLocation()
  const sidebar = useSidebar()

  const isActive = () => {
    const pathname = location().pathname
    return props.item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(props.item.href)
  }

  return (
    <SidebarMenuItem class={isActive() ? 'relative before:absolute before:left-0 before:top-1/2 before:h-3/4 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-sidebar-primary before:transition-all before:duration-150 before:ease-[var(--ease-out)]' : 'relative before:absolute before:left-0 before:top-1/2 before:h-3/4 before:w-0 before:-translate-y-1/2 before:rounded-r before:bg-sidebar-primary before:transition-all before:duration-150 before:ease-[var(--ease-out)]'}>
      <SidebarMenuButton
        as={Link}
        to={props.item.href}
        isActive={isActive()}
        tooltip={props.item.title}
        class="h-11 gap-3 px-3 transition-colors duration-150 hover:bg-sidebar-accent/60"
        onClick={() => {
          if (sidebar.isMobile()) {
            sidebar.setOpenMobile(false)
          }
        }}
      >
        <div
          class={`flex size-8 shrink-0 items-center justify-center rounded-lg ${props.item.iconBg} ${props.item.iconColor}`}
        >
          <props.item.icon class="size-4" />
        </div>
        <span class="text-[15px] font-medium">{props.item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** Settings/Analytics item with a chevron arrow — no icon */
const ChevronNavLink: Component<{ item: SettingsNavItem }> = (props) => {
  const location = useLocation()
  const sidebar = useSidebar()

  const isActive = () => location().pathname.startsWith(props.item.href)

  return (
    <SidebarMenuItem class={isActive() ? 'relative before:absolute before:left-0 before:top-1/2 before:h-3/4 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-sidebar-primary before:transition-all before:duration-150 before:ease-[var(--ease-out)]' : 'relative before:absolute before:left-0 before:top-1/2 before:h-3/4 before:w-0 before:-translate-y-1/2 before:rounded-r before:bg-sidebar-primary before:transition-all before:duration-150 before:ease-[var(--ease-out)]'}>
      <SidebarMenuButton
        as={Link}
        to={props.item.href}
        isActive={isActive()}
        tooltip={props.item.title}
        class="h-10 justify-between px-3 transition-colors duration-150 hover:bg-sidebar-accent/60"
        onClick={() => {
          if (sidebar.isMobile()) {
            sidebar.setOpenMobile(false)
          }
        }}
      >
        <span class="text-[14px]">{props.item.title}</span>
        <TbOutlineChevronRight class="size-4 shrink-0 opacity-40" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** Helper to get connection status indicator color */
const getConnectionStatusColor = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500'
    case 'reconnecting':
      return 'bg-amber-500'
    case 'disconnected':
      return 'bg-red-500'
  }
}

// ---------------------------------------------------------------------------
// AppSidebar
// ---------------------------------------------------------------------------

export const AppSidebar: Component<AppSidebarProps> = (props) => {
  const connectionStatus = () => props.connectionStatus ?? 'connected'

  return (
    <Sidebar collapsible="icon">
      {/* ── Quick Find trigger ────────────────────────────────────── */}
      <SidebarHeader class="px-3 pt-4 pb-2">
        <button
          type="button"
          onClick={() => props.onSearchClick?.()}
          class="flex h-10 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <TbOutlineSearch class="size-4 shrink-0" />
          <span class="flex-1 text-left group-data-[collapsible=icon]:hidden">
            Quick Find...
          </span>
          <kbd class="hidden rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 text-xs font-mono tabular-nums group-data-[collapsible=icon]:hidden sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Main navigation ─────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={mainNavItems}>
                {item => <MainNavLink item={item} />}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Settings ──────────────────────────────────────── */}
        <Collapsible defaultOpen={false} class="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel as={CollapsibleTrigger} class="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Settings
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <For each={settingsNavItems}>
                    {item => <ChevronNavLink item={item} />}
                  </For>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator />

        {/* ── Analytics ─────────────────────────────────────── */}
        <Collapsible defaultOpen={false} class="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel as={CollapsibleTrigger} class="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Analytics
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <For each={analyticsNavItems}>
                    {item => <ChevronNavLink item={item} />}
                  </For>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* ── User footer ──────────────────────────────────────── */}
      <SidebarFooter class="px-3 pb-4">
        <div class="flex items-center gap-3">
          {/* User avatar with connection status indicator */}
          <div class="relative">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
              JD
            </div>
            {/* Connection status dot */}
            <div
              class={`absolute bottom-0 right-0 size-[6px] rounded-full border-2 border-sidebar ${getConnectionStatusColor(connectionStatus())}`}
              title={connectionStatus()}
            />
          </div>
          <div class="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span class="truncate text-sm font-medium text-sidebar-foreground">
              John Doe
            </span>
            <span class="truncate text-xs text-sidebar-foreground/50">
              john@example.com
            </span>
          </div>
          <button
            type="button"
            class="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 group-data-[collapsible=icon]:hidden"
          >
            <TbOutlinePlus class="size-5" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
