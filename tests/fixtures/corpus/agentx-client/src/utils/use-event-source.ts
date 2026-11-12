// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Reactive EventSource (Server-Sent Events) wrapper for Solid.js
 */

import type { Accessor } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'

/**
 * EventSource connection status
 */
export type EventSourceStatus = 'CONNECTING' | 'OPEN' | 'CLOSED'

/**
 * Options for useEventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource
 */
export type UseEventSourceOptions = Readonly<{
  /**
   * Whether to automatically reconnect on error
   * @default false
   */
  autoReconnect?: boolean

  /**
   * Maximum number of reconnection attempts
   * @default Infinity
   */
  maxReconnectAttempts?: number

  /**
   * Delay between reconnection attempts in milliseconds
   * @default 3000
   */
  reconnectDelay?: number
} & EventSourceInit>

/**
 * Return type for useEventSource
 */
export type UseEventSourceReturn = Readonly<{
  /**
   * Reference to the current EventSource instance
   */
  eventSource: Accessor<EventSource | null>

  /**
   * Name of the last custom event received (null for default 'message' events)
   */
  event: Accessor<string | null>

  /**
   * Latest data received from the server
   */
  data: Accessor<string | null>

  /**
   * Current connection status
   */
  status: Accessor<EventSourceStatus>

  /**
   * Last error event (null if no errors)
   */
  error: Accessor<Event | null>

  /**
   * Number of reconnection attempts made
   */
  reconnectAttempts: Accessor<number>

  /**
   * Close the EventSource connection
   */
  close: () => void

  /**
   * Manually trigger reconnection
   */
  reconnect: () => void

  /**
   * Dispose method for `using` declaration support
   * @see https://github.com/tc39/proposal-explicit-resource-management
   */
  [Symbol.dispose]: () => void
}>

/**
 * Reactive wrapper for EventSource (Server-Sent Events)
 *
 * @param url - The URL to connect to
 * @param events - Array of custom event names to listen for (in addition to default 'message')
 * @param options - EventSource options and reconnection settings
 * @returns Reactive EventSource utilities and state
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { data, status, close } = useEventSource('/api/events')
 *
 * // Watch for data
 * createEffect(() => {
 *   console.log('New data:', data())
 * })
 *
 * // Custom events
 * const { data, event } = useEventSource('/api/events', ['notification', 'alert'])
 *
 * // With auto-reconnect
 * const { status, reconnectAttempts } = useEventSource('/api/events', [], {
 *   autoReconnect: true,
 *   maxReconnectAttempts: 5,
 *   reconnectDelay: 3000,
 * })
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
export const useEventSource = (url: string | URL, events: string[] = [], options: UseEventSourceOptions = {}): UseEventSourceReturn => {
  const {
    autoReconnect = false,
    maxReconnectAttempts = Number.POSITIVE_INFINITY,
    reconnectDelay = 3000,
    withCredentials = false,
  } = options

  // State
  const [eventSource, setEventSource] = createSignal<EventSource | null>(null)
  const [event, setEvent] = createSignal<string | null>(null)
  const [data, setData] = createSignal<string | null>(null)
  const [status, setStatus] = createSignal<EventSourceStatus>('CONNECTING')
  const [error, setError] = createSignal<Event | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = createSignal(0)

  // eslint-disable-next-line functional/no-let
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Close the EventSource connection
   */
  const close = () => {
    const es = eventSource()
    if (es) {
      es.close()
      setEventSource(null)
      setStatus('CLOSED')
    }

    // Clear reconnect timeout if any
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
  }

  /**
   * Create and setup EventSource connection
   */
  const connect = () => {
    // Close existing connection
    close()

    // Reset state
    setStatus('CONNECTING')
    setError(null)

    try {
      // Create new EventSource
      const es = new EventSource(url, { withCredentials })
      setEventSource(es)

      // Handle connection opened
      es.addEventListener('open', () => {
        setStatus('OPEN')
        setError(null)
        setReconnectAttempts(0) // Reset attempts on successful connection
      })

      // Handle errors
      es.addEventListener('error', (e) => {
        setStatus('CLOSED')
        setError(e)

        // Auto-reconnect if enabled
        if (autoReconnect && reconnectAttempts() < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1)

          reconnectTimeout = setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      })

      // Handle default 'message' event
      es.addEventListener('message', (e: MessageEvent) => {
        setEvent(null) // null indicates default message event
        setData(e.data)
      })

      // Handle custom events
      for (const eventName of events) {
        es.addEventListener(eventName, (e: Event & { data?: string }) => {
          setEvent(eventName)
          setData(e.data ?? null)
        })
      }
    }
    catch (err) {
      setStatus('CLOSED')
      setError(err instanceof Event ? err : null)
    }
  }

  /**
   * Manually trigger reconnection
   */
  const reconnect = () => {
    setReconnectAttempts(0)
    connect()
  }

  // Initial connection
  connect()

  // Cleanup on unmount
  onCleanup(() => {
    close()
  })

  return {
    eventSource,
    event,
    data,
    status,
    error,
    reconnectAttempts,
    close,
    reconnect,
    [Symbol.dispose]: close,
  }
}
