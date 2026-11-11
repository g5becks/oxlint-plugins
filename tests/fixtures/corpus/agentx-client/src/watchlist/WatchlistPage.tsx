// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { WatchlistItem } from '@agentx/core'

import { Button } from '#components/ui/button'
import { Card } from '#components/ui/card'
import { watchlistCollection } from '#stores/index'
import { useLiveQuery } from '@tanstack/solid-db'
import { TbOutlinePlus } from 'solid-icons/tb'
import { For, Show } from 'solid-js'

/**
 * Generate mock price data for a ticker
 * In production, this would come from a real-time market data feed
 */
const generateMockPrice = (symbol: string): { price: number, change: number, changePercent: number } => {
  // Use symbol as seed for consistent prices per ticker
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const basePrice = 50 + (seed % 450) // Price between $50 and $500

  // Random daily change between -5% and +5%
  const changePercent = (Math.random() - 0.5) * 10
  const change = (basePrice * changePercent) / 100

  return {
    price: basePrice,
    change,
    changePercent,
  }
}

/**
 * Format price with 2 decimals and tabular nums
 */
const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`
}

/**
 * Format change with sign, 2 decimals, and percentage
 */
const formatChange = (change: number, changePercent: number): { text: string, colorClass: string } => {
  const sign = change >= 0 ? '+' : ''
  const text = `${sign}$${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
  const colorClass = change >= 0 ? 'text-profit' : 'text-loss'

  return { text, colorClass }
}

/**
 * Watchlist Item Card Component
 */
const WatchlistItemCard = (props: { item: WatchlistItem }) => {
  const priceData = generateMockPrice(props.item.symbol)
  const changeDisplay = () => formatChange(priceData.change, priceData.changePercent)

  return (
    <Card class="p-4">
      <div class="flex flex-col gap-2">
        {/* Ticker symbol */}
        <div class="font-mono text-base font-semibold">
          {props.item.symbol}
        </div>

        {/* Display name (if different from symbol) */}
        <Show when={props.item.displayName && props.item.displayName !== props.item.symbol}>
          <div class="text-sm text-muted-foreground">
            {props.item.displayName}
          </div>
        </Show>

        {/* Current price */}
        <div class="font-mono text-right text-lg tabular-nums">
          {formatPrice(priceData.price)}
        </div>

        {/* Price change */}
        <div class={`font-mono text-right text-sm tabular-nums ${changeDisplay().colorClass}`}>
          {changeDisplay().text}
        </div>

        {/* Bias badge (optional) */}
        <Show when={props.item.bias}>
          <div class="text-xs text-muted-foreground">
            Bias:
            {' '}
            <span class="capitalize">{props.item.bias}</span>
          </div>
        </Show>
      </div>
    </Card>
  )
}

/**
 * Watchlist Page - Main component
 */
export const WatchlistPage = () => {
  const query = useLiveQuery(q => q.from({ watchlist: watchlistCollection }))

  // Sort by symbol alphabetically
  const sortedData = () => {
    if (!query.data || query.data.length === 0) {
      return []
    }
    const data = [...query.data]
    return data.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol))
  }

  return (
    <div class="mx-auto max-w-7xl">
      <Show
        when={query.data}
        fallback={(
          <div class="flex h-full items-center justify-center">
            <p class="text-xl text-muted-foreground">Loading watchlist...</p>
          </div>
        )}
      >
        <Show
          when={sortedData().length > 0}
          fallback={(
            <div class="flex h-full flex-col items-center justify-center gap-4">
              <p class="text-xl text-muted-foreground">
                No tickers in your watchlist yet
              </p>
              <Button variant="default" size="lg">
                <TbOutlinePlus class="mr-2 size-5" />
                Add Ticker
              </Button>
            </div>
          )}
        >
          {/* Responsive grid: 1 col mobile, 2 cols tablet, 3+ cols desktop */}
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <For each={sortedData()}>
              {/* eslint-disable-next-line no-type-assertion/no-type-assertion */}
              {item => <WatchlistItemCard item={item as any as WatchlistItem} />}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  )
}
