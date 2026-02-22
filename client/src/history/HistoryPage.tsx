// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { HistoryEvent } from '@agentx/core'

import { Badge } from '#components/ui/badge'
import { Card } from '#components/ui/card'
import { historyCollection } from '#stores/index'
import { useLiveQuery } from '@tanstack/solid-db'
import { For, Show } from 'solid-js'

/**
 * Format ISO timestamp to readable time (e.g., "Today, 14:32:45")
 */
const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  if (isToday) {
    return `Today, ${timeStr}`
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return `${dateStr}, ${timeStr}`
}

/**
 * Get status badge variant and text based on event type
 */
const getEventStatus = (
  event: HistoryEvent,
): { variant: 'success' | 'error' | 'warning', text: string } => {
  switch (event.eventType) {
    case 'position_opened':
      return { variant: 'success', text: 'FILLED' }
    case 'position_closed':
      return { variant: 'success', text: 'FILLED' }
    case 'strategy_failed':
      return { variant: 'error', text: 'FAILED' }
    case 'strategy_waiting':
      return { variant: 'warning', text: 'PENDING' }
    case 'action_executed':
      return event.success
        ? { variant: 'success', text: 'FILLED' }
        : { variant: 'error', text: 'FAILED' }
    default:
      return { variant: 'success', text: 'FILLED' }
  }
}

/**
 * Get left accent bar color class based on status
 */
const getAccentColor = (status: 'success' | 'error' | 'warning'): string => {
  switch (status) {
    case 'success':
      return 'bg-emerald-500'
    case 'error':
      return 'bg-red-500'
    case 'warning':
      return 'bg-amber-500'
  }
}

/**
 * Get action description for different event types
 */
const getActionDescription = (event: HistoryEvent): string | null => {
  switch (event.eventType) {
    case 'position_opened':
      return `${event.side.toUpperCase()} ${event.size} @ $${event.entryPrice.toFixed(2)}`
    case 'position_closed':
      return `CLOSE @ $${event.exitPrice.toFixed(2)} (P/L: ${event.pnl >= 0 ? '+' : ''}$${event.pnl.toFixed(2)})`
    case 'action_executed':
      return `${event.actionType} action executed`
    case 'strategy_started':
      return `Started by ${event.triggerAlert}`
    case 'strategy_completed':
      return `Completed in ${(event.duration / 1000).toFixed(1)}s`
    case 'strategy_failed':
      return `Failed: ${event.error}`
    case 'strategy_waiting':
      return `Waiting for ${event.waitingForAlert}`
    case 'alert_received':
      return `Alert received @ $${event.price.toFixed(2)}`
    case 'notification_sent':
      return `Notification sent via ${event.channel}`
    case 'strategy_activated':
      return `Activated ${event.activatedStrategyName}`
    default:
      return null
  }
}

/**
 * History Event Card Component
 */
const HistoryEventCard = (props: { event: HistoryEvent }) => {
  const status = () => getEventStatus(props.event)
  const accentColor = () => getAccentColor(status().variant)
  const actionDesc = () => getActionDescription(props.event)

  return (
    <Card class="relative flex overflow-hidden">
      {/* Left accent bar (3px) */}
      <div class={`w-[3px] flex-shrink-0 ${accentColor()}`} />

      {/* Card content */}
      <div class="flex flex-1 flex-col gap-1 p-4">
        {/* Timestamp */}
        <div class="text-xs text-muted-foreground">
          {formatTimestamp(props.event.timestamp)}
        </div>

        {/* Strategy name and ticker badge */}
        <div class="flex items-center gap-2">
          <span class="text-base font-medium">
            {props.event.strategyName}
          </span>
          <Badge variant="info" class="text-xs">
            {props.event.ticker}
          </Badge>
        </div>

        {/* Action description and status badge */}
        <div class="flex items-center justify-between gap-2">
          <Show when={actionDesc()}>
            <span class="font-mono text-sm tabular-nums">
              {actionDesc()}
            </span>
          </Show>
          <Badge variant={status().variant} class="ml-auto flex-shrink-0">
            {status().text}
          </Badge>
        </div>
      </div>
    </Card>
  )
}

/**
 * History Page - Main component
 */
export const HistoryPage = () => {
  const query = useLiveQuery(q => q.from({ history: historyCollection }))

  // Sort by timestamp descending in memory (after query)
  const sortedData = () => {
    if (!query.data || query.data.length === 0) {
      return []
    }
    const data = [...query.data]
    return data.sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      return timeB - timeA // descending
    })
  }

  return (
    <div class="mx-auto max-w-4xl space-y-4">
      <Show
        when={query.data}
        fallback={(
          <div class="flex h-full items-center justify-center">
            <p class="text-xl text-muted-foreground">Loading history...</p>
          </div>
        )}
      >
        <Show
          when={sortedData().length > 0}
          fallback={(
            <div class="flex h-full items-center justify-center">
              <p class="text-xl text-muted-foreground">No history events yet</p>
            </div>
          )}
        >
          <For each={sortedData()}>
            {/* eslint-disable-next-line no-type-assertion/no-type-assertion */}
            {event => <HistoryEventCard event={event as any as HistoryEvent} />}
          </For>
        </Show>
      </Show>
    </div>
  )
}
