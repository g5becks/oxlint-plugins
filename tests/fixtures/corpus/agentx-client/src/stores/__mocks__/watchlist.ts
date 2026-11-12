// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { CreateWatchlistItem as CreateWatchlistItemType } from '@agentx/core'
import type { WatchlistItemWithId } from './fixtures'

import { createCollection, localOnlyCollectionOptions } from '@tanstack/solid-db'
import { createFakeWatchlistItems, MOCK_WATCHLIST_ITEMS } from './fixtures'

// ============================================================
// MOCK COLLECTION USING TANSTACK DB LOCAL-ONLY COLLECTION
// ============================================================

/**
 * Create a mock watchlist collection using TanStack DB's localOnlyCollectionOptions.
 * This provides the same API as real collections but stores data in memory only.
 */
export const createMockWatchlistCollection = (
  initialData: readonly WatchlistItemWithId[] = MOCK_WATCHLIST_ITEMS,
) =>
  createCollection(
    localOnlyCollectionOptions<WatchlistItemWithId, string>({
      id: 'watchlist-mock',
      getKey: item => item._id,
      initialData: [...initialData],
    }),
  )

// ============================================================
// SINGLETON PATTERN
// ============================================================

type MockWatchlistCollection = ReturnType<typeof createMockWatchlistCollection>

const _singleton: { value: MockWatchlistCollection | null } = { value: null }

/**
 * Get the singleton mock watchlist collection.
 * Creates it lazily on first access.
 */
export const getMockWatchlistCollection = (): MockWatchlistCollection => {
  if (!_singleton.value) {
    _singleton.value = createMockWatchlistCollection()
  }
  return _singleton.value
}

/**
 * Reset the collection with fresh random data.
 * Useful for tests to ensure clean state.
 */
export const resetMockWatchlistCollection = (
  count = 25,
): MockWatchlistCollection => {
  _singleton.value = createMockWatchlistCollection(
    createFakeWatchlistItems(count),
  )
  return _singleton.value
}

/**
 * Clear the singleton reference.
 * Useful for test cleanup.
 */
export const clearMockWatchlistCollection = (): void => {
  _singleton.value = null
}

// ============================================================
// MOCK STORE - Mirrors real watchlistStore API
// ============================================================

/**
 * Mock watchlist store that mirrors the real watchlistStore API.
 * Uses TanStack DB's localOnlyCollection under the hood.
 */
export const mockWatchlistStore = {
  get collection() {
    return getMockWatchlistCollection()
  },

  /**
   * Insert new watchlist items. Items do NOT need _id - we generate temporary ones.
   * In real store, server generates IDs; here we generate them locally.
   */
  insert: (items: readonly CreateWatchlistItemType[]) => {
    const collection = getMockWatchlistCollection()
    for (const [index, item] of items.entries()) {
      const itemWithId: WatchlistItemWithId = {
        ...item,
        _id: `mock-${Date.now()}-${index}`,
      }
      collection.insert(itemWithId)
    }
  },

  update: (id: string, changes: Partial<WatchlistItemWithId>) => {
    const collection = getMockWatchlistCollection()
    collection.update(id, draft => Object.assign(draft, changes))
  },

  delete: (ids: readonly string[]) => {
    const collection = getMockWatchlistCollection()
    for (const id of ids) {
      collection.delete(id)
    }
  },

  refetch: (): Promise<void> => {
    // No-op in mock mode - data is already in memory
    return Promise.resolve()
  },
}
