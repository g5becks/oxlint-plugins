/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

type ImportMetaEnv = {
  readonly MODE: string
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean
  // Add your custom env variables here
  readonly VITE_MOCK_DATA?: string
}

type ImportMeta = {
  readonly env: ImportMetaEnv
}
