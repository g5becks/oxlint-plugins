// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Mock data fixture factories using Faker.js
 *
 * Generates realistic test data for alerts, strategies, history events, and watchlist items.
 * Uses seeded RNG for reproducible data generation.
 */

/* eslint-disable no-type-assertion/no-type-assertion */
/* eslint-disable sonarjs/no-duplicated-branches */

import type {
  Alert,
  HistoryEvent,
  Strategy,
  WatchlistItem,
} from '@agentx/core'
import { faker } from '@faker-js/faker'

// Helper types to ensure _id is present (not optional)
type WithId<T extends { _id?: string }> = Omit<T, '_id'> & { _id: string }

export type AlertWithId = WithId<Alert>

export type StrategyWithId = WithId<Strategy>

export type WatchlistItemWithId = WithId<WatchlistItem>

// HistoryEvent doesn't have _id in core types, so we add it here for mock data
export type HistoryEventWithId = HistoryEvent & { _id: string }

// Realistic ticker symbols for trading
const TICKERS = [
  'AAPL',
  'GOOGL',
  'MSFT',
  'AMZN',
  'TSLA',
  'NVDA',
  'META',
  'NFLX',
  'AMD',
  'INTC',
  'COIN',
  'SQ',
  'PYPL',
  'V',
  'MA',
  'JPM',
  'BAC',
  'GS',
  'MS',
  'C',
  'SPY',
  'QQQ',
  'IWM',
  'DIA',
  'VTI',
]

// Alert types
const ALERT_TYPES = ['signal', 'trigger'] as const

// History event types
const HISTORY_EVENT_TYPES = [
  'strategy_started',
  'strategy_completed',
  'strategy_waiting',
  'strategy_activated',
  'strategy_failed',
  'action_executed',
  'position_opened',
  'position_closed',
  'notification_sent',
  'alert_received',
] as const

// Bias options
const BIAS_OPTIONS = ['bullish', 'bearish', 'neutral'] as const

/**
 * Creates a fake Signal or Trigger alert
 */
export const createFakeAlert = (): AlertWithId => {
  const type = faker.helpers.arrayElement(ALERT_TYPES)
  const name = faker.helpers.arrayElement([
    'RSI Oversold',
    'MACD Crossover',
    'Volume Spike',
    'Price Breakout',
    'Moving Average Cross',
    'Support Level',
    'Resistance Level',
    'Trend Reversal',
  ])

  const baseAlert = {
    _id: faker.string.uuid(),
    name,
    description: faker.lorem.sentence(),
    createdAt: faker.date.past().getTime(),
    updatedAt: Date.now(),
  }

  if (type === 'signal') {
    return {
      ...baseAlert,
      type: 'signal',
      notifications: {
        sendEmail: faker.datatype.boolean(),
        sendToWebhookUrl: faker.datatype.boolean(),
        sendToTelegram: faker.datatype.boolean(),
        sendToDiscord: faker.datatype.boolean(),
      },
    } as AlertWithId
  }

  return {
    ...baseAlert,
    type: 'trigger',
  } as AlertWithId
}

/**
 * Creates a fake strategy
 */
export const createFakeStrategy = (): StrategyWithId => {
  const name = faker.helpers.arrayElement([
    'Momentum Scalper',
    'Mean Reversion',
    'Breakout Trader',
    'Swing Strategy',
    'Day Trading Bot',
    'Trend Follower',
    'Range Trader',
    'Volatility Crusher',
  ])

  const isActive = faker.datatype.boolean(0.7) // 70% chance of being active
  const tickers = faker.helpers.arrayElements(TICKERS, faker.number.int({ min: 1, max: 5 }))

  return {
    _id: faker.string.uuid(),
    name,
    description: faker.lorem.paragraph(),
    isActive,
    triggerAlert: faker.helpers.arrayElement([
      'RSI Oversold',
      'MACD Crossover',
      'Volume Spike',
      'Price Breakout',
    ]),
    actionChain: [], // Simplified - actions are complex objects
    activeFor: tickers,
    createdAt: faker.date.past().getTime(),
    updatedAt: Date.now(),
  }
}

/**
 * Creates a fake history event (discriminated union)
 */
export const createFakeHistoryEvent = (): HistoryEventWithId => {
  const eventType = faker.helpers.arrayElement(HISTORY_EVENT_TYPES)
  const strategyName = faker.helpers.arrayElement([
    'Momentum Scalper',
    'Mean Reversion',
    'Breakout Trader',
    'Swing Strategy',
  ])
  const ticker = faker.helpers.arrayElement(TICKERS)
  const timestamp = faker.date.recent({ days: 30 }).toISOString()

  const baseEvent = {
    _id: faker.string.uuid(),
    eventType,
    timestamp,
    strategyId: faker.string.uuid(),
    strategyName,
    ticker,
  }

  // Create specific event based on type
  switch (eventType) {
    case 'strategy_started':
      return {
        ...baseEvent,
        eventType: 'strategy_started',
        triggerAlert: faker.helpers.arrayElement(['RSI Oversold', 'MACD Crossover']),
      } as HistoryEventWithId

    case 'strategy_completed':
      return {
        ...baseEvent,
        eventType: 'strategy_completed',
        duration: faker.number.int({ min: 1000, max: 300000 }), // 1s to 5min
      } as HistoryEventWithId

    case 'strategy_waiting':
      return {
        ...baseEvent,
        eventType: 'strategy_waiting',
        waitingForAlert: faker.helpers.arrayElement(['RSI Oversold', 'MACD Crossover']),
        currentActionIndex: faker.number.int({ min: 0, max: 5 }),
      } as HistoryEventWithId

    case 'strategy_activated':
      return {
        ...baseEvent,
        eventType: 'strategy_activated',
        activatedStrategyId: faker.string.uuid(),
        activatedStrategyName: faker.helpers.arrayElement(['Momentum Scalper', 'Mean Reversion']),
        sourceStrategyName: strategyName,
      } as HistoryEventWithId

    case 'strategy_failed':
      return {
        ...baseEvent,
        eventType: 'strategy_failed',
        error: faker.helpers.arrayElement([
          'Insufficient funds',
          'API connection failed',
          'Order rejected',
          'Invalid signal',
        ]),
      } as HistoryEventWithId

    case 'action_executed':
      return {
        ...baseEvent,
        eventType: 'action_executed',
        actionIndex: faker.number.int({ min: 0, max: 5 }),
        actionType: faker.helpers.arrayElement(['BUY', 'SELL', 'NOTIFY']),
        success: faker.datatype.boolean(0.9), // 90% success rate
      } as HistoryEventWithId

    case 'position_opened':
      return {
        ...baseEvent,
        eventType: 'position_opened',
        broker: 'alpaca',
        orderId: faker.string.uuid(),
        entryPrice: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
        size: faker.number.int({ min: 1, max: 100 }),
        side: faker.helpers.arrayElement(['long', 'short'] as const),
      } as HistoryEventWithId

    case 'position_closed':
      return {
        ...baseEvent,
        eventType: 'position_closed',
        broker: 'alpaca',
        orderId: faker.string.uuid(),
        exitPrice: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
        pnl: faker.number.float({ min: -1000, max: 1000, fractionDigits: 2 }),
        reason: faker.helpers.arrayElement(['stop_loss', 'take_profit', 'manual', 'timeout']),
      } as HistoryEventWithId

    case 'notification_sent':
      return {
        ...baseEvent,
        eventType: 'notification_sent',
        channel: faker.helpers.arrayElement(['email', 'telegram', 'webhook'] as const),
        success: faker.datatype.boolean(0.95), // 95% success rate
      } as HistoryEventWithId

    case 'alert_received':
      return {
        ...baseEvent,
        eventType: 'alert_received',
        alertName: faker.helpers.arrayElement(['RSI Oversold', 'MACD Crossover', 'Volume Spike']),
        price: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
        volume: faker.number.int({ min: 10000, max: 10000000 }),
      } as HistoryEventWithId

    default:
      return {
        ...baseEvent,
        eventType: 'strategy_started',
        triggerAlert: faker.helpers.arrayElement(['RSI Oversold', 'MACD Crossover']),
      } as HistoryEventWithId
  }
}

/**
 * Creates a fake watchlist item
 */
export const createFakeWatchlistItem = (): WatchlistItemWithId => {
  const symbol = faker.helpers.arrayElement(TICKERS)
  const bias = faker.helpers.arrayElement(BIAS_OPTIONS)

  return {
    _id: faker.string.uuid(),
    symbol,
    displayName: symbol,
    bias,
    notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : undefined,
    createdAt: faker.date.past().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Batch generators
export const createFakeAlerts = (count: number): AlertWithId[] =>
  Array.from({ length: count }, () => createFakeAlert())

export const createFakeStrategies = (count: number): StrategyWithId[] =>
  Array.from({ length: count }, () => createFakeStrategy())

export const createFakeHistoryEvents = (count: number): HistoryEventWithId[] =>
  Array.from({ length: count }, () => createFakeHistoryEvent())

export const createFakeWatchlistItems = (count: number): WatchlistItemWithId[] =>
  Array.from({ length: count }, () => createFakeWatchlistItem())

// Pre-generate datasets with seeded RNG for reproducible data
faker.seed(12345)

export const MOCK_ALERTS = createFakeAlerts(15)

export const MOCK_STRATEGIES = createFakeStrategies(8)

export const MOCK_WATCHLIST_ITEMS = createFakeWatchlistItems(25)

export const MOCK_HISTORY_EVENTS = createFakeHistoryEvents(50)

// Reset seed for runtime randomness
faker.seed()
