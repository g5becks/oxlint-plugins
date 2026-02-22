// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { Logger as LogLevelLogger } from 'loglevel'
import type { Owner } from 'solid-js'
import {
  debugComputation as _debugComputation,
  debugOwnerComputations as _debugOwnerComputations,
  debugOwnerSignals as _debugOwnerSignals,
  debugProps as _debugProps,
  debugSignal as _debugSignal,
  debugSignals as _debugSignals,
} from '@solid-devtools/logger'
import log from 'loglevel'
import * as prefix from 'loglevel-plugin-prefix'

/**
 * Logger configuration options
 */
export type LoggerConfig = Readonly<{
  /**
   * The log level to use
   * @default 'error' in production, 'debug' in development
   */
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  /**
   * Template for log prefix
   * @default '[%t] %l (%n):'
   */
  template?: string
  /**
   * Whether to persist log level to localStorage
   * @default true
   */
  persist?: boolean
  /**
   * Custom format function for log prefix
   */
  format?: (
    level: string,
    name: string | undefined,
    timestamp: Date,
  ) => string | undefined
}>

/**
 * Logger context options
 */
export type LoggerContext = Readonly<{
  /**
   * Module or component name
   */
  module?: string
  /**
   * Function or method name
   */
  function?: string
  /**
   * Additional context metadata
   */
  [key: string]: unknown
}>

/**
 * Enhanced logger that combines loglevel, loglevel-plugin-prefix, and @solid-devtools/logger
 *
 * @example
 * ```ts
 * import { logger } from '#utils/logger'
 *
 * // Basic logging
 * logger.info('Application started')
 * logger.warn('Configuration missing')
 * logger.error('Failed to fetch data', error)
 *
 * // Debug Solid.js computations
 * createEffect(() => {
 *   logger.debugComputation()
 *   // your effect code
 * })
 *
 * // Debug signals
 * const [count, setCount] = createSignal(0)
 * logger.debugSignal(count)
 * ```
 */
export class Logger {
  private readonly logger: LogLevelLogger
  private readonly context?: LoggerContext

  constructor(name?: string, config?: LoggerConfig, context?: LoggerContext) {
    this.logger
      = name !== undefined && name.length > 0 ? log.getLogger(name) : log
    this.context = context

    // Register prefix plugin
    prefix.reg(log)

    // Apply configuration
    if (config) {
      this.configure(config)
    }
    else {
      // Apply default configuration based on environment
      // In production: only log errors
      // In development: log everything (debug and above)
      this.configure({
        level: import.meta.env.PROD ? 'error' : 'debug',
        template: '[%t] %l (%n):',
      })
    }
  }

  /**
   * Format a message with context
   */
  private formatMessage(message: unknown): string {
    if (this.context === undefined) {
      return String(message)
    }

    const parts: string[] = []

    if (this.context.module !== undefined) {
      parts.push(`[${this.context.module}]`)
    }

    if (this.context.function !== undefined) {
      parts.push(`[${this.context.function}]`)
    }

    const contextStr = parts.length > 0 ? `${parts.join(' ')} ` : ''
    return `${contextStr}${String(message)}`
  }

  /**
   * Configure the logger with custom options
   *
   * @param config - Logger configuration options
   *
   * @example
   * ```ts
   * logger.configure({
   *   level: 'debug',
   *   template: '[%t] %l:',
   *   persist: true,
   * })
   * ```
   */
  configure(config: LoggerConfig): void {
    if (config.level !== undefined) {
      this.logger.setLevel(config.level, config.persist ?? true)
    }

    const prefixConfig: {
      template?: string
      format?: (
        level: string,
        name: string | undefined,
        timestamp: Date,
      ) => string | undefined
      levelFormatter?: (level: string) => string
      nameFormatter?: (name: string | undefined) => string
      timestampFormatter?: (date: Date) => string
    } = {}

    if (config.format !== undefined) {
      prefixConfig.format = config.format
    }
    else if (config.template !== undefined) {
      prefixConfig.template = config.template
      prefixConfig.levelFormatter = level => level.toUpperCase()
      prefixConfig.nameFormatter = (name?: string) => name ?? 'root'
      prefixConfig.timestampFormatter = (date) => {
        const timeStr = date.toTimeString()
        const match = /(\d{2}:\d{2}:\d{2})/.exec(timeStr)
        return match?.[1] ?? timeStr
      }
    }

    prefix.apply(this.logger, prefixConfig)
  }

  /**
   * Log a trace message (most verbose level)
   *
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   *
   * @example
   * ```ts
   * logger.trace('Entering function', { params: data })
   * ```
   */
  trace(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.trace(this.formatMessage(message), ...optionalParams)
  }

  /**
   * Log a debug message
   *
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   *
   * @example
   * ```ts
   * logger.debug('Variable value:', count())
   * ```
   */
  debug(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(this.formatMessage(message), ...optionalParams)
  }

  /**
   * Log an info message
   *
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   *
   * @example
   * ```ts
   * logger.info('User logged in', { userId: user.id })
   * ```
   */
  info(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(this.formatMessage(message), ...optionalParams)
  }

  /**
   * Log a warning message
   *
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   *
   * @example
   * ```ts
   * logger.warn('API rate limit approaching', { remaining: 10 })
   * ```
   */
  warn(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(this.formatMessage(message), ...optionalParams)
  }

  /**
   * Log an error message
   *
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   *
   * @example
   * ```ts
   * try {
   *   await fetchData()
   * } catch (error) {
   *   logger.error('Failed to fetch data', error)
   * }
   * ```
   */
  error(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.error(this.formatMessage(message), ...optionalParams)
  }

  /**
   * Alias for debug() for console compatibility
   *
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   */
  log(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.log(this.formatMessage(message), ...optionalParams)
  }

  /**
   * Create a child logger with additional context
   *
   * @param context - Additional context to add to logs
   * @returns A new Logger instance with merged context
   *
   * @example
   * ```ts
   * const authLogger = logger.withContext({ module: 'auth' })
   * const loginLogger = authLogger.withContext({ function: 'handleLogin' })
   * loginLogger.info('User login attempt') // [auth] [handleLogin] User login attempt
   * ```
   */
  withContext(context: LoggerContext): Logger {
    const mergedContext = { ...this.context, ...context }
    const loggerName = (() => {
      if (this.logger === log) {
        return undefined
      }

      const maybeName = Reflect.get(this.logger, 'name')
      return typeof maybeName === 'string' ? maybeName : undefined
    })()

    return new Logger(loggerName, undefined, mergedContext)
  }

  /**
   * Set the logging level
   *
   * @param level - The log level to set
   * @param persist - Whether to persist the level to localStorage
   *
   * @example
   * ```ts
   * logger.setLevel('debug')
   * logger.setLevel('error', false) // Don't persist
   * ```
   */
  setLevel(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent',
    persist?: boolean,
  ): void {
    this.logger.setLevel(level, persist)
  }

  /**
   * Get the current logging level
   *
   * @returns The current log level as a number (0-5)
   *
   * @example
   * ```ts
   * const level = logger.getLevel()
   * if (level <= logger.levels.DEBUG) {
   *   // Generate expensive debug data
   * }
   * ```
   */
  getLevel(): number {
    return this.logger.getLevel()
  }

  /**
   * Enable all logging (equivalent to setLevel('trace'))
   *
   * @example
   * ```ts
   * logger.enableAll()
   * ```
   */
  enableAll(): void {
    this.logger.enableAll()
  }

  /**
   * Disable all logging (equivalent to setLevel('silent'))
   *
   * @example
   * ```ts
   * logger.disableAll()
   * ```
   */
  disableAll(): void {
    this.logger.disableAll()
  }

  /**
   * Get log level constants
   *
   * @example
   * ```ts
   * logger.setLevel(logger.levels.WARN)
   * ```
   */
  get levels() {
    return this.logger.levels
  }

  // Solid.js debugging utilities

  /**
   * Debug the current computation owner by logging its lifecycle state to the browser console.
   *
   * Tracks:
   * - Initial state (value, name, dependencies, execution time)
   * - State after each rerun (value, previous value, dependencies, sources that caused rerun)
   * - Computation disposal
   *
   * @param owner - The owner to debug (defaults to current owner)
   * @param options - Debug options
   *
   * @example
   * ```ts
   * createEffect(() => {
   *   logger.debugComputation()
   *   // Effect will log its lifecycle to console
   *   console.log(count())
   * })
   * ```
   */
  debugComputation(
    owner?: Owner,
    options?: Parameters<typeof _debugComputation>[1],
  ): void {
    _debugComputation(owner, options)
  }

  /**
   * Debug all computations owned by the provided owner by logging their lifecycle state.
   *
   * Tracks:
   * - All computations' initial state
   * - State after each rerun
   * - Computation disposal
   *
   * @param owner - The owner to debug (defaults to current owner)
   *
   * @example
   * ```ts
   * const Component = () => {
   *   logger.debugOwnerComputations()
   *
   *   createEffect(() => {
   *     // This effect will be logged
   *   })
   *
   *   createMemo(() => {
   *     // This memo will be logged
   *     return count() * 2
   *   })
   *
   *   return <div>Component</div>
   * }
   * ```
   */
  debugOwnerComputations(owner?: Owner): void {
    _debugOwnerComputations(owner)
  }

  /**
   * Debug a signal by logging its lifecycle state to the browser console.
   *
   * Tracks:
   * - Initial state (value, name, observers)
   * - State after each value update (value, previous value, observers, caused reruns)
   *
   * @param source - The signal to debug (a function that accesses the signal)
   * @param options - Debug options
   *
   * @example
   * ```ts
   * const [count, setCount] = createSignal(0)
   *
   * logger.debugSignal(count)
   *
   * setCount(1) // Will log the update to console
   * ```
   */
  debugSignal(
    source: () => unknown,
    options?: Parameters<typeof _debugSignal>[1],
  ): void {
    _debugSignal(source, options)
  }

  /**
   * Debug multiple signals by logging their lifecycle state to the browser console.
   *
   * @param source - Array of signals or a function that calls multiple signals
   * @param options - Debug options
   *
   * @example
   * ```ts
   * const [count, setCount] = createSignal(0)
   * const double = createMemo(() => count() * 2)
   *
   * // Option 1: Array of signals
   * logger.debugSignals([count, double])
   *
   * // Option 2: Function that calls signals
   * logger.debugSignals(() => {
   *   count()
   *   double()
   * })
   * ```
   */
  debugSignals(
    source: Array<() => unknown> | (() => void),
    options?: Parameters<typeof _debugSignals>[1],
  ): void {
    _debugSignals(source, options)
  }

  /**
   * Debug all signals created under a reactive owner by logging their lifecycle state.
   *
   * Tracks:
   * - Signals' initial state
   * - State after each value update
   *
   * @param owner - The owner to get signals from (defaults to current owner)
   * @param options - Debug options
   *
   * @example
   * ```ts
   * const Component = () => {
   *   const [count, setCount] = createSignal(0)
   *   const double = createMemo(() => count() * 2)
   *
   *   logger.debugOwnerSignals()
   *
   *   // Both count and double will be logged
   *   return <button onClick={() => setCount(p => p + 1)}>{count()}</button>
   * }
   * ```
   */
  debugOwnerSignals(
    owner?: Owner,
    options?: Parameters<typeof _debugOwnerSignals>[1],
  ): void {
    _debugOwnerSignals(owner, options)
  }

  /**
   * Debug component props by logging their state to the console.
   *
   * @param props - The component's props object to debug
   *
   * @example
   * ```ts
   * const Button = (props: { count: number, onClick: () => void }) => {
   *   logger.debugProps(props)
   *
   *   // Props will be logged whenever they change
   *   return (
   *     <button onClick={props.onClick}>
   *       Count: {props.count}
   *     </button>
   *   )
   * }
   * ```
   */
  debugProps(props?: Parameters<typeof _debugProps>[0]): void {
    if (props) {
      _debugProps(props)
    }
  }

  /**
   * Create a child logger with an independent log level
   *
   * @param name - The name for the child logger
   * @param config - Optional configuration for the child logger
   * @param context - Optional context for the logger
   * @returns A new Logger instance
   *
   * @example
   * ```ts
   * // Create module-specific loggers
   * const authLogger = logger.getLogger('auth')
   * const apiLogger = logger.getLogger('api')
   *
   * // Configure independently
   * authLogger.setLevel('debug')
   * apiLogger.setLevel('error')
   *
   * authLogger.debug('User authenticated') // Will log
   * apiLogger.debug('API called') // Won't log (level is error)
   * ```
   */
  getLogger(
    name: string,
    config?: LoggerConfig,
    context?: LoggerContext,
  ): Logger {
    return new Logger(name, config, context)
  }
}

/**
 * Default logger instance
 *
 * @example
 * ```ts
 * import { logger } from '#utils/logger'
 *
 * logger.info('Application started')
 * ```
 */
export const logger = new Logger()

/**
 * Get a logger with context for a specific module/component
 *
 * This is the recommended way to create loggers throughout your app.
 * It automatically sets the appropriate log level based on the environment:
 * - Production: Only errors are logged
 * - Development: Debug and above are logged
 *
 * @param context - Context for the logger (module name, function name, etc.)
 * @param config - Optional configuration to override defaults
 * @returns A new Logger instance with context
 *
 * @example
 * ```ts
 * // Simple module logger
 * const log = getLogger({ module: 'AuthService' })
 * log.info('User logged in')
 * // Output: [12:34:56] INFO (root): [AuthService] User logged in
 *
 * // Logger with function context
 * const log = getLogger({ module: 'UserAPI', function: 'fetchUser' })
 * log.debug('Fetching user', { userId: 123 })
 * // Output: [12:34:56] DEBUG (root): [UserAPI] [fetchUser] Fetching user { userId: 123 }
 *
 * // Named logger with context
 * const log = getLogger({ module: 'PaymentService' })
 * const checkoutLog = log.withContext({ function: 'processCheckout' })
 * checkoutLog.info('Processing payment')
 * // Output: [12:34:56] INFO (root): [PaymentService] [processCheckout] Processing payment
 * ```
 */
export const getLogger = (context: LoggerContext, config?: LoggerConfig): Logger => new Logger(undefined, config, context)

/**
 * Create a named logger for a specific module
 *
 * @param name - The name for the logger
 * @param config - Optional configuration
 * @param context - Optional context
 * @returns A new Logger instance
 *
 * @example
 * ```ts
 * import { createLogger } from '#utils/logger'
 *
 * const apiLogger = createLogger('api', { level: 'debug' })
 * apiLogger.debug('Fetching data...')
 * ```
 */
export const createLogger = (name: string, config?: LoggerConfig, context?: LoggerContext): Logger => new Logger(name, config, context)

export default logger
