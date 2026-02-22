// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import { ToggleGroup, ToggleGroupItem } from '#components/ui/toggle-group'
import { useTheme } from '#stores/theme-store'
import { TbOutlineDeviceLaptop, TbOutlineMoon, TbOutlineSun } from 'solid-icons/tb'

/**
 * AppearancePage - Settings page for theme and appearance preferences
 */
export const AppearancePage = () => {
  const { mode, setMode } = useTheme()

  return (
    <div class="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 class="text-xl font-semibold">Appearance</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Control how AgentX looks on your device.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <h2 class="text-base font-medium">Theme</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Select your preferred color scheme.
          </p>
        </div>

        <ToggleGroup
          value={mode()}
          onChange={(value) => {
            if (value && (value === 'light' || value === 'dark' || value === 'system'))
              setMode(value)
          }}
          class="grid grid-cols-3 gap-3"
        >
          <ToggleGroupItem
            value="light"
            class="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent p-4 data-[pressed]:border-primary data-[pressed]:bg-accent"
          >
            <TbOutlineSun class="size-6" />
            <span class="text-sm font-medium">Light</span>
          </ToggleGroupItem>

          <ToggleGroupItem
            value="dark"
            class="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent p-4 data-[pressed]:border-primary data-[pressed]:bg-accent"
          >
            <TbOutlineMoon class="size-6" />
            <span class="text-sm font-medium">Dark</span>
          </ToggleGroupItem>

          <ToggleGroupItem
            value="system"
            class="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent p-4 data-[pressed]:border-primary data-[pressed]:bg-accent"
          >
            <TbOutlineDeviceLaptop class="size-6" />
            <span class="text-sm font-medium">System</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <p class="text-xs text-muted-foreground">
          When set to System, AgentX follows your operating system's appearance setting.
        </p>
      </div>
    </div>
  )
}
