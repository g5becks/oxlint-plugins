// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Store Barrel with Mock/Real Collection Switching
 *
 * This file conditionally exports mock or real collections based on VITE_MOCK_DATA.
 * Components import from this barrel and never know whether mock or real data is used.
 */

// Check if we're in mock mode
// Import mock collections
import {
  getMockAlertsCollection,
  getMockHistoryCollection,
  getMockStrategiesCollection,
  getMockWatchlistCollection,
} from './__mocks__'

const MOCK_MODE = import.meta.env.VITE_MOCK_DATA === 'true'

// TODO: Import real collections when implemented (from TanStack DB migration epic task-147)
// import { realAlertsCollection } from './alerts'
// import { realStrategiesCollection } from './strategies'
// import { realHistoryCollection } from './history'
// import { realWatchlistCollection } from './watchlist'

// Placeholder for real collections (to be implemented)
// TODO: Import real collections when implemented (from TanStack DB migration epic task-147)
// const realAlertsCollection = ...
// const realStrategiesCollection = ...
// const realHistoryCollection = ...
// const realWatchlistCollection = ...

// ============================================================
// CONDITIONAL COLLECTION EXPORTS
// ============================================================

/**
 * Alerts collection - switches between mock and real based on VITE_MOCK_DATA
 * @throws Error if VITE_MOCK_DATA is not enabled and real collections are not implemented
 */
export const alertsCollection = (() => {
  if (MOCK_MODE) {
    return getMockAlertsCollection()
  }
  throw new Error(
    'Real alerts collection not implemented. Set VITE_MOCK_DATA=true to use mock data.',
  )
})()

/**
 * Strategies collection - switches between mock and real based on VITE_MOCK_DATA
 * @throws Error if VITE_MOCK_DATA is not enabled and real collections are not implemented
 */
export const strategiesCollection = (() => {
  if (MOCK_MODE) {
    return getMockStrategiesCollection()
  }
  throw new Error(
    'Real strategies collection not implemented. Set VITE_MOCK_DATA=true to use mock data.',
  )
})()

/**
 * History events collection - switches between mock and real based on VITE_MOCK_DATA
 * @throws Error if VITE_MOCK_DATA is not enabled and real collections are not implemented
 */
export const historyCollection = (() => {
  if (MOCK_MODE) {
    return getMockHistoryCollection()
  }
  throw new Error(
    'Real history collection not implemented. Set VITE_MOCK_DATA=true to use mock data.',
  )
})()

/**
 * Watchlist items collection - switches between mock and real based on VITE_MOCK_DATA
 * @throws Error if VITE_MOCK_DATA is not enabled and real collections are not implemented
 */
export const watchlistCollection = (() => {
  if (MOCK_MODE) {
    return getMockWatchlistCollection()
  }
  throw new Error(
    'Real watchlist collection not implemented. Set VITE_MOCK_DATA=true to use mock data.',
  )
})()

// ============================================================
// THEME STORE RE-EXPORTS
// ============================================================

export { ThemeProvider, useTheme } from './theme-store'

export type { ThemeMode } from './theme-store'
