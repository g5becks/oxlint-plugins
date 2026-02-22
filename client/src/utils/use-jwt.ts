// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Reactive JWT decoder for Solid.js
 * Based on VueUse's useJwt
 */

import type { JwtHeader, JwtPayload } from 'jwt-decode'
import type { Accessor } from 'solid-js'
import { jwtDecode } from 'jwt-decode'
import { createMemo } from 'solid-js'

export type UseJwtOptions<Fallback> = Readonly<{
  /**
   * Value returned when encounter error on decoding
   *
   * @default null
   */
  fallbackValue: Fallback

  /**
   * Error callback for decoding
   */
  onError?: (error: unknown) => void
}>

export type UseJwtReturn<Payload, Header, Fallback> = Readonly<{
  header: Accessor<Header | Fallback>
  payload: Accessor<Payload | Fallback>
}>

/**
 * Reactive decoded JWT token
 *
 * @example
 * ```ts
 * const token = createSignal('eyJhbGc...')
 * const { header, payload } = useJwt(token, { fallbackValue: null })
 *
 * // Access decoded values
 * console.log(payload().exp) // Expiration timestamp
 * console.log(header().alg)  // Algorithm
 * ```
 */
export const useJwt = <
  Payload extends object = JwtPayload,
  Header extends object = JwtHeader,
  Fallback = null,
>(encodedJwt: Accessor<string> | string,
  options: UseJwtOptions<Fallback>,
): UseJwtReturn<Payload, Header, Fallback> => {
  const { onError, fallbackValue } = options

  // Convert string to accessor for uniform handling
  const tokenAccessor
    = typeof encodedJwt === 'string' ? () => encodedJwt : encodedJwt

  // Reactive header decoding
  const header = createMemo((): Header | Fallback => {
    try {
      return jwtDecode<Header>(tokenAccessor(), { header: true })
    }
    catch (err) {
      onError?.(err)
      return fallbackValue
    }
  })

  // Reactive payload decoding
  const payload = createMemo((): Payload | Fallback => {
    try {
      return jwtDecode<Payload>(tokenAccessor())
    }
    catch (err) {
      onError?.(err)
      return fallbackValue
    }
  })

  return {
    header,
    payload,
  }
}

/**
 * Check if JWT token is expired
 *
 * @param payload - JWT payload with exp claim
 * @returns true if token is expired or invalid
 */
export const isJwtExpired = (payload: JwtPayload | null): boolean => {
  if (!payload || typeof payload.exp !== 'number') {
    return true
  }

  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp < Date.now() / 1000
}

/**
 * Get time until JWT expiration in milliseconds
 *
 * @param payload - JWT payload with exp claim
 * @returns milliseconds until expiration, or 0 if expired/invalid
 */
export const getJwtTimeToExpiry = (payload: JwtPayload | null): number => {
  if (!payload || typeof payload.exp !== 'number') {
    return 0
  }

  const expiryMs = payload.exp * 1000
  const now = Date.now()

  return Math.max(0, expiryMs - now)
}
