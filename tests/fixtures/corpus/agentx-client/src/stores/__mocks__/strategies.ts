// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { Strategy as StrategyType } from '@agentx/core'
import type { StrategyWithId } from './fixtures'

import { createCollection, localOnlyCollectionOptions } from '@tanstack/solid-db'
import { createFakeStrategies, MOCK_STRATEGIES } from './fixtures'

// ============================================================
// MOCK COLLECTION USING TANSTACK DB LOCAL-ONLY COLLECTION
// ============================================================

/**
 * Create a mock strategies collection using TanStack DB's localOnlyCollectionOptions.
 * This provides the same API as real collections but stores data in memory only.
 */
export const createMockStrategiesCollection = (
  initialData: readonly StrategyWithId[] = MOCK_STRATEGIES,
) =>
  createCollection(
    localOnlyCollectionOptions<StrategyWithId, string>({
      id: 'strategies-mock',
      getKey: item => item._id,
      initialData: [...initialData],
    }),
  )

// ============================================================
// SINGLETON PATTERN
// ============================================================

type MockStrategiesCollection = ReturnType<
  typeof createMockStrategiesCollection
>

const _singleton: { value: MockStrategiesCollection | null } = { value: null }

/**
 * Get the singleton mock strategies collection.
 * Creates it lazily on first access.
 */
export const getMockStrategiesCollection = (): MockStrategiesCollection => {
  if (!_singleton.value) {
    _singleton.value = createMockStrategiesCollection()
  }
  return _singleton.value
}

/**
 * Reset the collection with fresh random data.
 * Useful for tests to ensure clean state.
 */
export const resetMockStrategiesCollection = (
  count = 8,
): MockStrategiesCollection => {
  _singleton.value = createMockStrategiesCollection(
    createFakeStrategies(count),
  )
  return _singleton.value
}

/**
 * Clear the singleton reference.
 * Useful for test cleanup.
 */
export const clearMockStrategiesCollection = (): void => {
  _singleton.value = null
}

// ============================================================
// MOCK STORE - Mirrors real strategiesStore API
// ============================================================

/**
 * Mock strategies store that mirrors the real strategiesStore API.
 * Uses TanStack DB's localOnlyCollection under the hood.
 */
export const mockStrategiesStore = {
  get collection() {
    return getMockStrategiesCollection()
  },

  /**
   * Insert new strategies. Items do NOT need _id - we generate temporary ones.
   * In real store, server generates IDs; here we generate them locally.
   */
  insert: (items: readonly StrategyType[]) => {
    const collection = getMockStrategiesCollection()
    for (const [index, item] of items.entries()) {
      const itemWithId: StrategyWithId = {
        ...item,
        _id: `mock-${Date.now()}-${index}`,
      }
      collection.insert(itemWithId)
    }
  },

  update: (id: string, changes: Partial<StrategyWithId>) => {
    const collection = getMockStrategiesCollection()
    collection.update(id, draft => Object.assign(draft, changes))
  },

  delete: (ids: readonly string[]) => {
    const collection = getMockStrategiesCollection()
    for (const id of ids) {
      collection.delete(id)
    }
  },

  /**
   * Activate a strategy for a specific watchlist item.
   * In mock mode, this is a no-op that returns immediately.
   */
  activate: (_strategyId: string, _itemId: string): Promise<void> => {
    // No-op in mock mode
    return Promise.resolve()
  },

  /**
   * Deactivate a strategy for a specific watchlist item.
   * In mock mode, this is a no-op that returns immediately.
   */
  deactivate: (_strategyId: string, _itemId: string): Promise<void> => {
    // No-op in mock mode
    return Promise.resolve()
  },

  refetch: (): Promise<void> => {
    // No-op in mock mode - data is already in memory
    return Promise.resolve()
  },

  getQueryKey: () => ['strategies'] as const,
}
