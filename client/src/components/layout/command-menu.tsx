import type { IconTypes } from 'solid-icons'
import type { Accessor, Component } from 'solid-js'
import { cn } from '#/lib/utils'
import { Dialog, DialogContent } from '#components/ui/dialog'
import { createShortcut } from '@solid-primitives/keyboard'
import { useNavigate } from '@tanstack/solid-router'
import {
  TbOutlineBell,
  TbOutlineClock,
  TbOutlineEye,
  TbOutlineNews,
  TbOutlineSearch,
  TbOutlineStack2,
} from 'solid-icons/tb'
import { createEffect, createSignal, For, Show } from 'solid-js'

type CommandMenuProps = {
  /** Controlled open state */
  open: Accessor<boolean>
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void
}

type NavItem = {
  id: string
  label: string
  description: string
  href: string
  icon: IconTypes
  group: 'navigation' | 'settings' | 'analytics'
  keywords: string[]
}

const navigationItems: NavItem[] = [
  {
    id: 'history',
    label: 'History',
    description: 'View trade execution history',
    href: '/history',
    icon: TbOutlineClock,
    group: 'navigation',
    keywords: ['history', 'trades', 'executions', 'past'],
  },
  {
    id: 'strategies',
    label: 'Strategies',
    description: 'Manage trading strategies',
    href: '/strategies',
    icon: TbOutlineStack2,
    group: 'navigation',
    keywords: ['strategies', 'algorithms', 'bots', 'automation'],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Price alerts and notifications',
    href: '/alerts',
    icon: TbOutlineBell,
    group: 'navigation',
    keywords: ['alerts', 'notifications', 'warnings', 'price'],
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    description: 'Track market symbols',
    href: '/watchlist',
    icon: TbOutlineEye,
    group: 'navigation',
    keywords: ['watchlist', 'symbols', 'tickers', 'monitor'],
  },
  {
    id: 'news',
    label: 'News',
    description: 'Market news and updates',
    href: '/news',
    icon: TbOutlineNews,
    group: 'navigation',
    keywords: ['news', 'updates', 'market', 'headlines'],
  },
  {
    id: 'settings-notifications',
    label: 'Notification Settings',
    description: 'Configure notification preferences',
    href: '/settings/notifications',
    icon: TbOutlineBell,
    group: 'settings',
    keywords: ['settings', 'notifications', 'alerts', 'preferences'],
  },
  {
    id: 'settings-brokers',
    label: 'Broker Connections',
    description: 'Manage broker integrations',
    href: '/settings/brokers',
    icon: TbOutlineStack2,
    group: 'settings',
    keywords: ['settings', 'brokers', 'connections', 'api'],
  },
  {
    id: 'settings-appearance',
    label: 'Appearance',
    description: 'Customize theme and display',
    href: '/settings/appearance',
    icon: TbOutlineEye,
    group: 'settings',
    keywords: ['settings', 'appearance', 'theme', 'dark', 'light'],
  },
  {
    id: 'analytics-pnl',
    label: 'P&L Dashboard',
    description: 'Profit and loss analytics',
    href: '/analytics/pnl',
    icon: TbOutlineStack2,
    group: 'analytics',
    keywords: ['analytics', 'pnl', 'profit', 'loss', 'performance'],
  },
  {
    id: 'analytics-performance',
    label: 'Performance',
    description: 'Strategy performance metrics',
    href: '/analytics/performance',
    icon: TbOutlineStack2,
    group: 'analytics',
    keywords: ['analytics', 'performance', 'metrics', 'stats'],
  },
]

const CommandMenuItem: Component<{
  item: NavItem
  isSelected: boolean
  onSelect: () => void
}> = (props) => {
  return (
    <button
      type="button"
      class={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        props.isSelected && 'bg-accent text-accent-foreground border-l-2 border-primary',
      )}
      onClick={props.onSelect}
    >
      <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <props.item.icon class="size-4" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-sm font-medium">{props.item.label}</span>
        <span class="truncate text-xs text-muted-foreground">{props.item.description}</span>
      </div>
    </button>
  )
}

export const CommandMenu: Component<CommandMenuProps> = (props) => {
  const navigate = useNavigate()
  const [query, setQuery] = createSignal('')
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  // Filter items based on search query
  const filteredItems = () => {
    const q = query().toLowerCase().trim()
    if (!q)
      return navigationItems

    return navigationItems.filter(
      item =>
        item.label.toLowerCase().includes(q)
        || item.description.toLowerCase().includes(q)
        || item.keywords.some(keyword => keyword.includes(q)),
    )
  }

  // Group filtered items
  const groupedItems = () => {
    const items = filteredItems()
    return {
      navigation: items.filter(item => item.group === 'navigation'),
      settings: items.filter(item => item.group === 'settings'),
      analytics: items.filter(item => item.group === 'analytics'),
    }
  }

  // Reset state when dialog opens/closes
  createEffect(() => {
    if (props.open()) {
      setQuery('')
      setSelectedIndex(0)
    }
  })

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const items = filteredItems()
    if (!items.length)
      return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % items.length)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
        break
      }
      case 'Enter': {
        e.preventDefault()
        const selectedItem = items[selectedIndex()]
        if (selectedItem) {
          navigate({ to: selectedItem.href })
          props.onOpenChange(false)
        }
        break
      }
      case 'Escape': {
        e.preventDefault()
        props.onOpenChange(false)
        break
      }
    }
  }

  // Global Cmd+K / Ctrl+K shortcut
  createShortcut(['Control', 'K'], () => props.onOpenChange(true))
  createShortcut(['Meta', 'K'], () => props.onOpenChange(true))

  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <DialogContent
        class="max-w-[640px] p-0"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div class="flex h-12 items-center gap-3 border-b px-4">
          <TbOutlineSearch class="size-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search commands..."
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query()}
            onInput={e => setQuery(e.currentTarget.value)}
            autofocus
          />
          <kbd class="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono tabular-nums sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div class="max-h-[400px] overflow-y-auto p-2">
          <Show
            when={filteredItems().length > 0}
            fallback={(
              <div class="py-8 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
          >
            <div class="space-y-4">
              {/* Navigation Group */}
              <Show when={groupedItems().navigation.length > 0}>
                <div>
                  <div class="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pages
                  </div>
                  <div class="space-y-0.5">
                    <For each={groupedItems().navigation}>
                      {(item) => {
                        const globalIndex = filteredItems().indexOf(item)
                        return (
                          <CommandMenuItem
                            item={item}
                            isSelected={selectedIndex() === globalIndex}
                            onSelect={() => {
                              navigate({ to: item.href })
                              props.onOpenChange(false)
                            }}
                          />
                        )
                      }}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Settings Group */}
              <Show when={groupedItems().settings.length > 0}>
                <div>
                  <div class="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Settings
                  </div>
                  <div class="space-y-0.5">
                    <For each={groupedItems().settings}>
                      {(item) => {
                        const globalIndex = filteredItems().indexOf(item)
                        return (
                          <CommandMenuItem
                            item={item}
                            isSelected={selectedIndex() === globalIndex}
                            onSelect={() => {
                              navigate({ to: item.href })
                              props.onOpenChange(false)
                            }}
                          />
                        )
                      }}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Analytics Group */}
              <Show when={groupedItems().analytics.length > 0}>
                <div>
                  <div class="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Analytics
                  </div>
                  <div class="space-y-0.5">
                    <For each={groupedItems().analytics}>
                      {(item) => {
                        const globalIndex = filteredItems().indexOf(item)
                        return (
                          <CommandMenuItem
                            item={item}
                            isSelected={selectedIndex() === globalIndex}
                            onSelect={() => {
                              navigate({ to: item.href })
                              props.onOpenChange(false)
                            }}
                          />
                        )
                      }}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </DialogContent>
    </Dialog>
  )
}
