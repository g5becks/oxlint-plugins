// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Reactive web notifications using Solid.js signals and primitives
 * Ported from solidjs-use with modern primitives
 */

import type { Accessor } from 'solid-js'
import { createEventBus } from '@solid-primitives/event-bus'
import { createPermission } from '@solid-primitives/permission'
import { createSignal, onCleanup, onMount } from 'solid-js'

/**
 * Event hook type for notification events
 */
type EventHookOn<T> = (callback: (event: T) => void) => () => void

/**
 * Event hook for triggering and listening to events
 */
type EventHook<T> = Readonly<{
  on: EventHookOn<T>
  trigger: (event: T) => void
}>

/**
 * Create an event hook using event-bus primitive
 */
const createEventHook = <T = Event>(): EventHook<T> => {
  const bus = createEventBus<T>()
  return {
    on: bus.listen,
    trigger: bus.emit,
  }
}

/**
 * Web Notification options
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Notification
 */
export type WebNotificationOptions = Readonly<{
  /**
   * The title read-only property of the Notification interface indicates
   * the title of the notification
   *
   * @default ''
   */
  title?: string

  /**
   * The body string of the notification as specified in the constructor's
   * options parameter.
   *
   * @default ''
   */
  body?: string

  /**
   * The text direction of the notification as specified in the constructor's
   * options parameter.
   *
   * @default 'auto'
   */
  dir?: 'auto' | 'ltr' | 'rtl'

  /**
   * The language code of the notification as specified in the constructor's
   * options parameter.
   *
   * @default DOMString
   */
  lang?: string

  /**
   * The ID of the notification (if any) as specified in the constructor's options
   * parameter.
   *
   * @default ''
   */
  tag?: string

  /**
   * The URL of the image used as an icon of the notification as specified
   * in the constructor's options parameter.
   *
   * @default ''
   */
  icon?: string

  /**
   * Specifies whether the user should be notified after a new notification
   * replaces an old one.
   *
   * @default false
   */
  renotify?: boolean

  /**
   * A boolean value indicating that a notification should remain active until the
   * user clicks or dismisses it, rather than closing automatically.
   *
   * @default false
   */
  requireInteraction?: boolean

  /**
   * The silent read-only property of the Notification interface specifies
   * whether the notification should be silent, i.e., no sounds or vibrations
   * should be issued, regardless of the device settings.
   *
   * @default false
   */
  silent?: boolean

  /**
   * Specifies a vibration pattern for devices with vibration hardware to emit.
   * A vibration pattern, as specified in the Vibration API spec
   *
   * @see https://w3c.github.io/vibration/
   */
  vibrate?: number[]
}>

/**
 * Return type for useWebNotification
 */
export type UseWebNotificationReturn = Readonly<{
  /**
   * Whether the Notification API is supported
   */
  isSupported: Accessor<boolean>

  /**
   * Current notification permission state
   * - "unknown" - permission state cannot be determined
   * - "denied" - user denied permission
   * - "granted" - user granted permission
   * - "prompt" - user needs to be asked for permission
   */
  permission: Accessor<PermissionState | 'unknown'>

  /**
   * Current notification instance
   */
  notification: Accessor<Notification | null>

  /**
   * Show a notification
   * @param overrides - Override default notification options
   * @returns The created Notification instance
   */
  show: (
    overrides?: WebNotificationOptions,
  ) => Promise<Notification | undefined>

  /**
   * Close the current notification
   */
  close: () => void

  /**
   * Listen to notification click events
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  onClick: EventHookOn<Event>

  /**
   * Listen to notification show events
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  onShow: EventHookOn<Event>

  /**
   * Listen to notification error events
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  onError: EventHookOn<Event>

  /**
   * Listen to notification close events
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  onClose: EventHookOn<Event>

  /**
   * Dispose method for `using` declaration support
   * @see https://github.com/tc39/proposal-explicit-resource-management
   */
  [Symbol.dispose]: () => void
}>

/**
 * Reactive Web Notification
 *
 * @param defaultOptions - Default notification options
 * @returns Notification utilities and state
 *
 * @example
 * ```typescript
 * const { isSupported, permission, show, close, onClick } = useWebNotification({
 *   title: 'Hello!',
 *   body: 'This is a notification',
 *   icon: '/icon.png',
 * })
 *
 * // Check if supported
 * if (isSupported()) {
 *   // Show notification
 *   await show()
 *
 *   // Listen to click
 *   onClick((evt) => {
 *     console.log('Notification clicked!')
 *     close()
 *   })
 * }
 * ```
 */
export const useWebNotification = (defaultOptions: WebNotificationOptions = {}): UseWebNotificationReturn => {
  // Check if Notification API is supported
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  // Create permission accessor (reactive)
  const permission = isSupported
    ? createPermission('notifications')
    : () => 'unknown' as const

  // Current notification instance
  const [notification, setNotification] = createSignal<Notification | null>(
    null,
  )

  // Event hooks for notification events
  const clickHook = createEventHook<Event>()
  const showHook = createEventHook<Event>()
  const errorHook = createEventHook<Event>()
  const closeHook = createEventHook<Event>()

  /**
   * Request notification permission
   */
  const requestPermission = async () => {
    if (!isSupported)
      return

    if (Notification.permission !== 'denied') {
      await Notification.requestPermission()
    }
  }

  /**
   * Show a notification
   */
  const show = async (overrides?: WebNotificationOptions) => {
    if (!isSupported)
      return

    // Request permission if needed
    await requestPermission()

    // Merge options
    const options = { ...defaultOptions, ...overrides }

    // Create notification
    const notif = new Notification(options.title ?? '', options)
    setNotification(notif)

    // Attach event handlers
    notif.onclick = clickHook.trigger
    notif.onshow = showHook.trigger
    notif.onerror = errorHook.trigger
    notif.onclose = closeHook.trigger

    return notif
  }

  /**
   * Close the current notification
   */
  const close = () => {
    const notif = notification()
    if (notif)
      notif.close()

    setNotification(null)
  }

  // Request permission on mount
  onMount(() => {
    if (isSupported)
      void requestPermission()
  })

  // Cleanup on unmount
  onCleanup(() => {
    close()
  })

  // Auto-close notification when tab becomes visible
  if (isSupported) {
    const handleVisibilityChange = (e: Event) => {
      e.preventDefault()
      if (document.visibilityState === 'visible')
        close()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    onCleanup(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  }

  return {
    isSupported: () => isSupported,
    permission,
    notification,
    show,
    close,
    onClick: clickHook.on,
    onShow: showHook.on,
    onError: errorHook.on,
    onClose: closeHook.on,
    [Symbol.dispose]: close,
  }
}

export type { EventHookOn }
