// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { Alert as AlertType } from '@agentx/core'
import type { AlertWithId } from './fixtures'

import { createCollection, localOnlyCollectionOptions } from '@tanstack/solid-db'
import { createFakeAlerts, MOCK_ALERTS } from './fixtures'

// ============================================================
// MOCK COLLECTION USING TANSTACK DB LOCAL-ONLY COLLECTION
// ============================================================

/**
 * Create a mock alerts collection using TanStack DB's localOnlyCollectionOptions.
 * This provides the same API as real collections but stores data in memory only.
 */
export const createMockAlertsCollection = (
  initialData: readonly AlertWithId[] = MOCK_ALERTS,
) =>
  createCollection(
    localOnlyCollectionOptions<AlertWithId, string>({
      id: 'alerts-mock',
      getKey: item => item._id,
      initialData: [...initialData],
    }),
  )

// ============================================================
// SINGLETON PATTERN
// ============================================================

type MockAlertsCollection = ReturnType<typeof createMockAlertsCollection>

const _singleton: { value: MockAlertsCollection | null } = { value: null }

/**
 * Get the singleton mock alerts collection.
 * Creates it lazily on first access.
 */
export const getMockAlertsCollection = (): MockAlertsCollection => {
  if (!_singleton.value) {
    _singleton.value = createMockAlertsCollection()
  }
  return _singleton.value
}

/**
 * Reset the collection with fresh random data.
 * Useful for tests to ensure clean state.
 */
export const resetMockAlertsCollection = (count = 15): MockAlertsCollection => {
  _singleton.value = createMockAlertsCollection(createFakeAlerts(count))
  return _singleton.value
}

/**
 * Clear the singleton reference.
 * Useful for test cleanup.
 */
export const clearMockAlertsCollection = (): void => {
  _singleton.value = null
}

// ============================================================
// MOCK STORE - Mirrors real alertsStore API
// ============================================================

/**
 * Mock alerts store that mirrors the real alertsStore API.
 * Uses TanStack DB's localOnlyCollection under the hood.
 */
export const mockAlertsStore = {
  get collection() {
    return getMockAlertsCollection()
  },

  insert: (items: readonly AlertWithId[]) => {
    const collection = getMockAlertsCollection()
    for (const item of items) {
      collection.insert(item)
    }
  },

  update: (id: string, changes: Partial<AlertType>) => {
    const collection = getMockAlertsCollection()
    collection.update(id, draft => Object.assign(draft, changes))
  },

  delete: (ids: readonly string[]) => {
    const collection = getMockAlertsCollection()
    for (const id of ids) {
      collection.delete(id)
    }
  },

  toggleEnabled: (_id: string) => {
    // No-op - alerts don't have a simple enabled field
    // The notification settings are what control "enabled" for SignalAlerts
  },

  refetch: (): Promise<void> => {
    // No-op in mock mode - data is already in memory
    return Promise.resolve()
  },
}
