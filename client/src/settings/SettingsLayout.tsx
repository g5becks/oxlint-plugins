// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs'
import { Link, Outlet, useLocation } from '@tanstack/solid-router'
import { For } from 'solid-js'

type SettingsTab = {
  label: string
  value: string
  href: string
}

const settingsTabs: SettingsTab[] = [
  { label: 'Notifications', value: 'notifications', href: '/settings/notifications' },
  { label: 'Brokers', value: 'brokers', href: '/settings/brokers' },
  { label: 'Appearance', value: 'appearance', href: '/settings/appearance' },
  { label: 'Backup & Restore', value: 'backup', href: '/settings/backup' },
  { label: 'Security', value: 'security', href: '/settings/security' },
]

/**
 * SettingsLayout - Parent layout for all settings pages
 *
 * Renders a tab navigation bar at the top with horizontal scrolling
 * on mobile. Each tab links to its respective settings sub-page.
 */
export const SettingsLayout = () => {
  const location = useLocation()

  // Extract the current tab value from the pathname
  const getCurrentTab = () => {
    const pathname = location().pathname
    const tab = settingsTabs.find(t => pathname.startsWith(t.href))
    return tab?.value ?? 'notifications'
  }

  return (
    <div class="flex h-full flex-col">
      {/* Tab navigation */}
      <div class="border-b border-border px-4 py-4">
        <Tabs value={getCurrentTab()} class="w-full">
          <TabsList class="inline-flex w-full justify-start overflow-x-auto bg-transparent p-0 sm:w-auto">
            <For each={settingsTabs}>
              {tab => (
                <TabsTrigger
                  value={tab.value}
                  as={Link}
                  href={tab.href}
                  class="flex-shrink-0 data-[selected]:bg-muted"
                >
                  {tab.label}
                </TabsTrigger>
              )}
            </For>
          </TabsList>
        </Tabs>
      </div>

      {/* Child route content */}
      <div class="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
