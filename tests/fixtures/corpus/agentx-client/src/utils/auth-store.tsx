// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Reactive authentication store using Solid.js signals
 * Uses @solid-primitives/storage for automatic persistence
 */

import type { JwtPayload } from 'jwt-decode'
import type { Accessor, JSX, ParentProps } from 'solid-js'
import { isJwtExpired, useJwt } from '#utils/use-jwt'
import { makePersisted } from '@solid-primitives/storage'
import { createContext, createEffect, createMemo, createSignal, useContext } from 'solid-js'

type User = Readonly<{
  id: string
  email: string
  name?: string
}>

type AuthContextValue = Readonly<{
  user: Accessor<User | null>
  isAuthenticated: Accessor<boolean>
  token: Accessor<string>
  login: (token: string) => void
  logout: () => void
}>

const AuthContext = createContext<AuthContextValue>()

const AuthProvider = (props: ParentProps): JSX.Element => {
  // eslint-disable-next-line solid/reactivity -- makePersisted returns a proper signal tuple
  const [token, setToken] = makePersisted(createSignal<string>(''), {
    name: 'authToken',
    storage: localStorage,
  })

  const { payload } = useJwt<JwtPayload, Record<string, unknown>, null>(token, {
    fallbackValue: null,
    onError: (error) => {
      console.error('JWT decode error:', error)
    },
  })

  const isTokenExpired = createMemo(() => isJwtExpired(payload()))

  const isAuthenticated = createMemo(() => {
    const currentToken = token()
    return Boolean(currentToken && !isTokenExpired())
  })

  const user = createMemo((): User | null => {
    const p = payload()
    if (!p || isTokenExpired())
      return null

    return {
      id: p.sub ?? '',
      email: 'email' in p && typeof p.email === 'string' ? p.email : '',
      name: 'name' in p && typeof p.name === 'string' ? p.name : undefined,
    }
  })

  createEffect(() => {
    if (token() && isTokenExpired()) {
      console.warn('Token expired, clearing')
      setToken('')
    }
  })

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    token,
    login: (newToken: string) => setToken(newToken),
    logout: () => setToken(''),
  }

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  )
}

const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    console.error('useAuth must be used within AuthProvider')
    return {
      user: () => null,
      isAuthenticated: () => false,
      token: () => '',
      login: () => {},
      logout: () => {},
    }
  }
  return context
}

export { AuthProvider, useAuth }
