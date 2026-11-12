// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { Alert } from '@agentx/core'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card } from '#components/ui/card'
import { alertsCollection } from '#stores/index'
import { useLiveQuery } from '@tanstack/solid-db'
import { TbOutlineBell, TbOutlinePlus } from 'solid-icons/tb'
import { For, Show } from 'solid-js'

/**
 * Get badge variant and text for alert type
 */
const getAlertTypeBadge = (
  type: 'signal' | 'trigger',
): { variant: 'info' | 'success', text: string } => {
  if (type === 'signal') {
    return { variant: 'info', text: 'SIGNAL' }
  }
  return { variant: 'success', text: 'TRIGGER' }
}

/**
 * Get left accent bar color based on alert type
 */
const getAccentColor = (type: 'signal' | 'trigger'): string => {
  return type === 'signal' ? 'bg-blue-500' : 'bg-emerald-500'
}

/**
 * Format timestamp to readable date (e.g., "Jan 15, 2026")
 */
const formatCreatedDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Alert Card Component
 */
const AlertCard = (props: { alert: Alert }) => {
  const typeBadge = () => getAlertTypeBadge(props.alert.type)
  const accentColor = () => getAccentColor(props.alert.type)
  const createdDate = () =>
    props.alert.createdAt ? formatCreatedDate(props.alert.createdAt) : 'Unknown'

  return (
    <Card class="relative flex overflow-hidden">
      {/* Left accent bar (3px) */}
      <div class={`w-[3px] flex-shrink-0 ${accentColor()}`} />

      {/* Card content */}
      <div class="flex flex-1 items-start gap-4 p-4">
        {/* Icon */}
        <div class="flex-shrink-0 pt-1">
          <TbOutlineBell class="size-6 text-muted-foreground" />
        </div>

        {/* Alert info */}
        <div class="flex flex-1 flex-col gap-1">
          {/* Name and type badge */}
          <div class="flex items-center justify-between gap-2">
            <span class="text-base font-medium">{props.alert.name}</span>
            <Badge variant={typeBadge().variant} class="flex-shrink-0">
              {typeBadge().text}
            </Badge>
          </div>

          {/* Description */}
          <Show when={props.alert.description}>
            <p class="text-sm text-muted-foreground">
              {props.alert.description}
            </p>
          </Show>

          {/* Created date */}
          <div class="text-xs text-muted-foreground">
            Created:
            {' '}
            {createdDate()}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Alerts Page - Main component
 */
export const AlertsPage = () => {
  const query = useLiveQuery(q => q.from({ alerts: alertsCollection }))

  // Sort by name alphabetically
  const sortedData = () => {
    if (!query.data || query.data.length === 0) {
      return []
    }
    const data = [...query.data]
    return data.sort((a: any, b: any) => a.name.localeCompare(b.name))
  }

  return (
    <div class="mx-auto max-w-4xl space-y-4">
      <Show
        when={query.data}
        fallback={(
          <div class="flex h-full items-center justify-center">
            <p class="text-xl text-muted-foreground">Loading alerts...</p>
          </div>
        )}
      >
        <Show
          when={sortedData().length > 0}
          fallback={(
            <div class="flex h-full flex-col items-center justify-center gap-4">
              <p class="text-xl text-muted-foreground">
                No alerts created yet
              </p>
              <Button variant="default" size="lg">
                <TbOutlinePlus class="mr-2 size-5" />
                Create Alert
              </Button>
            </div>
          )}
        >
          <For each={sortedData()}>
            {/* eslint-disable-next-line no-type-assertion/no-type-assertion */}
            {alert => <AlertCard alert={alert as any as Alert} />}
          </For>
        </Show>
      </Show>
    </div>
  )
}
