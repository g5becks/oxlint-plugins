// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type {
  HistoryEventTypeFilter,
} from '@agentx/core'
import type { Accessor } from 'solid-js'

import type { HistoryEventWithId } from './fixtures'
import { createCollection, localOnlyCollectionOptions } from '@tanstack/solid-db'
import { createFakeHistoryEvents, MOCK_HISTORY_EVENTS } from './fixtures'

// ============================================================
// MOCK COLLECTION USING TANSTACK DB LOCAL-ONLY COLLECTION
// ============================================================

/**
 * Create a mock history collection using TanStack DB's localOnlyCollectionOptions.
 * This provides the same API as real collections but stores data in memory only.
 */
export const createMockHistoryCollection = (
  initialData: readonly HistoryEventWithId[] = MOCK_HISTORY_EVENTS,
) =>
  createCollection(
    localOnlyCollectionOptions<HistoryEventWithId, string>({
      id: 'history-mock',
      getKey: item => item._id,
      initialData: [...initialData],
    }),
  )

// ============================================================
// SINGLETON PATTERN
// ============================================================

type MockHistoryCollection = ReturnType<typeof createMockHistoryCollection>

const _singleton: { value: MockHistoryCollection | null } = { value: null }

/**
 * Get the singleton mock history collection.
 * Creates it lazily on first access.
 */
export const getMockHistoryCollection = (): MockHistoryCollection => {
  if (!_singleton.value) {
    _singleton.value = createMockHistoryCollection()
  }
  return _singleton.value
}

/**
 * Reset the collection with fresh random data.
 * Useful for tests to ensure clean state.
 */
export const resetMockHistoryCollection = (
  count = 50,
): MockHistoryCollection => {
  _singleton.value = createMockHistoryCollection(createFakeHistoryEvents(count))
  return _singleton.value
}

/**
 * Clear the singleton reference.
 * Useful for test cleanup.
 */
export const clearMockHistoryCollection = (): void => {
  _singleton.value = null
}

// ============================================================
// MOCK STORE - Mirrors real historyStore API
// ============================================================

/**
 * Mock history store that mirrors the real historyStore API.
 * Uses TanStack DB's localOnlyCollection under the hood.
 */
export const mockHistoryStore = {
  get collection() {
    return getMockHistoryCollection()
  },

  /**
   * Get query parameters for filtered history events.
   * Use with useLiveQuery from @tanstack/solid-db for reactive queries.
   */
  getFilterParams: (filters: {
    eventTypeFilter: Accessor<HistoryEventTypeFilter>
    searchQuery: Accessor<string>
    pageSize: Accessor<number>
    currentPage: Accessor<number>
  }) => {
    return {
      eventType: filters.eventTypeFilter,
      limit: filters.pageSize,
      skip: () => filters.currentPage() * filters.pageSize(),
    }
  },

  refetch: (): Promise<void> => {
    // No-op in mock mode - data is already in memory
    return Promise.resolve()
  },

  getQueryKey: () => ['history'] as const,
}
