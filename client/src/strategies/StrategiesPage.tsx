// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { Strategy } from '@agentx/core'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card } from '#components/ui/card'
import { strategiesCollection } from '#stores/index'
import { useLiveQuery } from '@tanstack/solid-db'
import { TbOutlineChartLine, TbOutlinePlus } from 'solid-icons/tb'
import { For, Show } from 'solid-js'

/**
 * Get status badge variant and text for a strategy
 */
const getStrategyStatus = (
  strategy: Strategy,
): { variant: 'success' | 'warning' | 'neutral', text: string } => {
  if (strategy.isActive) {
    return { variant: 'success', text: 'ACTIVE' }
  }
  // Check if it's a draft (no createdAt or very recent)
  if (!strategy.createdAt || Date.now() - strategy.createdAt < 60000) {
    return { variant: 'neutral', text: 'DRAFT' }
  }
  return { variant: 'warning', text: 'PAUSED' }
}

/**
 * Get left accent bar color based on status
 */
const getAccentColor = (status: 'success' | 'warning' | 'neutral'): string => {
  switch (status) {
    case 'success':
      return 'bg-blue-500'
    case 'warning':
      return 'bg-amber-500'
    case 'neutral':
      return 'bg-gray-500'
  }
}

/**
 * Format last run time (mock - would come from executions in real data)
 */
const formatLastRun = (): string => {
  const minutes = Math.floor(Math.random() * 60) + 1
  if (minutes === 1)
    return '1 minute ago'
  if (minutes < 60)
    return `${minutes} minutes ago`
  return 'Never'
}

/**
 * Calculate mock P&L for demonstration
 */
const calculatePnL = (): number => {
  return (Math.random() - 0.4) * 2500 // Random between -1000 and +1500
}

/**
 * Format P&L with sign and color
 */
const formatPnL = (pnl: number): { text: string, colorClass: string } => {
  const formatted = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
  const colorClass = pnl >= 0 ? 'text-profit' : 'text-loss'
  return { text: formatted, colorClass }
}

/**
 * Strategy Card Component
 */
const StrategyCard = (props: { strategy: Strategy }) => {
  const status = () => getStrategyStatus(props.strategy)
  const accentColor = () => getAccentColor(status().variant)
  const isActive = () => props.strategy.isActive
  const activeTickersCount = () => props.strategy.activeFor.length
  const lastRun = formatLastRun()
  const pnl = calculatePnL()
  const pnlDisplay = () => formatPnL(pnl)

  return (
    <Card class="relative flex overflow-hidden">
      {/* Left accent bar (3px) */}
      <div class={`w-[3px] flex-shrink-0 ${accentColor()}`} />

      {/* Card content */}
      <div class="flex flex-1 items-center gap-4 p-4">
        {/* Icon with optional pulse dot */}
        <div class="relative flex-shrink-0">
          <TbOutlineChartLine class="size-8 text-muted-foreground" />
          {/* Pulse dot for active strategies */}
          <Show when={isActive()}>
            <span class="absolute -right-1 -top-1 flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </Show>
        </div>

        {/* Strategy info */}
        <div class="flex flex-1 flex-col gap-1">
          {/* Name and status badge */}
          <div class="flex items-center justify-between gap-2">
            <span class="text-base font-medium">
              {props.strategy.name}
            </span>
            <Badge variant={status().variant} class="flex-shrink-0">
              {status().text}
            </Badge>
          </div>

          {/* Metadata */}
          <div class="text-sm text-muted-foreground">
            {activeTickersCount()}
            {' '}
            active ticker
            {activeTickersCount() !== 1 ? 's' : ''}
            {' '}
            · Last run:
            {lastRun}
          </div>

          {/* P&L */}
          <div class={`font-mono text-sm tabular-nums ${pnlDisplay().colorClass}`}>
            P/L today:
            {' '}
            {pnlDisplay().text}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Strategies Page - Main component
 */
export const StrategiesPage = () => {
  const query = useLiveQuery(q => q.from({ strategies: strategiesCollection }))

  // Sort by isActive first, then by name
  const sortedData = () => {
    if (!query.data || query.data.length === 0) {
      return []
    }
    const data = [...query.data]
    return data.sort((a: any, b: any) => {
      // Active strategies first
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1
      }
      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    })
  }

  return (
    <div class="mx-auto max-w-4xl space-y-4">
      <Show
        when={query.data}
        fallback={(
          <div class="flex h-full items-center justify-center">
            <p class="text-xl text-muted-foreground">Loading strategies...</p>
          </div>
        )}
      >
        <Show
          when={sortedData().length > 0}
          fallback={(
            <div class="flex h-full flex-col items-center justify-center gap-4">
              <p class="text-xl text-muted-foreground">No strategies created yet</p>
              <Button variant="default" size="lg">
                <TbOutlinePlus class="mr-2 size-5" />
                Create Strategy
              </Button>
            </div>
          )}
        >
          <For each={sortedData()}>
            {/* eslint-disable-next-line no-type-assertion/no-type-assertion */}
            {strategy => <StrategyCard strategy={strategy as any as Strategy} />}
          </For>
        </Show>
      </Show>
    </div>
  )
}
