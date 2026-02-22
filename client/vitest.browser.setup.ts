import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll } from 'vitest'

import { worker } from './src/__mocks__/browser'

// Enable API mocking before all tests
beforeAll(async () => {
    await worker.start({ onUnhandledRequest: 'warn' })
})

// Reset handlers after each test
afterEach(() => {
    worker.resetHandlers()
})
