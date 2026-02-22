// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { Middleware } from 'openapi-fetch'
import type { paths } from './v1'
import { getLogger } from '#utils/logger'
import createClient from 'openapi-fetch'

const log = getLogger({ module: 'API' })

const UNPROTECTED_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/admin-exists',
]

/**
 * API error class for better error handling
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const authMiddleware: Middleware = {
  onRequest: async ({ request, schemaPath }) => {
    log.debug(`Requesting data using path ${schemaPath}`)

    // Check if the route is unprotected first
    if (UNPROTECTED_ROUTES.some(route => schemaPath.startsWith(route))) {
      return request
    }

    const token = localStorage.getItem('token')

    if (token === null || token.length === 0) {
      log.error('Authorization token is missing.')
      return Promise.reject(new ApiError('Unauthorized: Token is missing.'))
    }

    log.debug(`Auth token: ${token}`)
    request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },

  onResponse: ({ response }) => {
    if (!response.ok && response.status === 401) {
      log.warn('Unauthorized. Token might be expired or invalid.')
      localStorage.removeItem('token')
    }
    return response
  },
}

// Get API base URL - with proxy setup, API requests go to same origin
const getApiBaseUrl = (): string => {
  // With proxy setup, API requests go to the same origin as the web app
  // The Go server will proxy /api/* requests to the Node.js server
  const currentOrigin = globalThis.location.origin
  log.debug('Using same-origin API base URL:', currentOrigin)
  return currentOrigin
}

const baseUrl = getApiBaseUrl()
log.debug('Creating client with base URL:', baseUrl)

export const client = createClient<paths>({ baseUrl })
client.use(authMiddleware)

/**
 * Parse API errors into a consistent format
 */
export const parseApiError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string') {
      return new ApiError(message)
    }

    const errorMessage = Reflect.get(error, 'error')
    if (typeof errorMessage === 'string') {
      return new ApiError(errorMessage)
    }
  }

  return new ApiError('An unknown error occurred')
}
