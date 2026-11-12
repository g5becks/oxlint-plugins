import { attachDevtoolsOverlay } from '@solid-devtools/overlay'
import { render } from 'solid-js/web'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

// Attach devtools overlay for development
if (import.meta.env.DEV) {
  attachDevtoolsOverlay({
    defaultOpen: false,
    noPadding: true,
  })
}

// Register service worker for PWA functionality
registerSW({ immediate: true })

const root = document.getElementById('root')

if (root instanceof HTMLElement) {
  render(() => <App />, root)
}
