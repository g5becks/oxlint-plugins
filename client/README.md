# AgentX Client Documentation

## Getting Started

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete guide for developers
  - Quick start and setup
  - Tech stack overview
  - Project structure
  - Architecture patterns
  - Code style and conventions

## Feature Guides

### Core Features
- **Alerts Management** - Signal and trigger alerts with notifications
- **Strategy Builder** - IFTTT-style action chains for automated trading
- **Watchlist** - Track tickers with bias indicators
- **News Feed** - RSS articles with pull-to-refresh
- **Settings** - Notifications, brokers, appearance, security, backup
- **Analytics** - P&L dashboard, performance reports, win/loss analysis

### Implementation Details
- **State Management** - TanStack Query for server state, Signals for client state
- **Forms** - TanStack Form with useAppForm hook
- **Real-Time** - Server-Sent Events (SSE) via useEventSource
- **API Client** - openapi-fetch with type safety

## Quality & Performance

- **[Accessibility](./ACCESSIBILITY.md)** - WCAG 2.1 AA compliance guidelines
  - Ionic built-in accessibility
  - Testing procedures
  - Common patterns
  - Screen reader support

- **[Performance](./PERFORMANCE.md)** - Optimization strategies
  - Build-time optimizations (Vite)
  - Runtime optimizations (SolidJS)
  - Profiling procedures
  - Performance targets

- **[E2E Testing](./E2E_TESTING.md)** - End-to-end testing strategy
  - Playwright setup
  - Critical test paths
  - CI/CD integration
  - Best practices

## PWA Features

- **[Offline Strategy](./src/offline/OFFLINE_STRATEGY.md)** - Offline-first architecture
  - Service worker caching
  - TanStack Query persistence
  - Offline detection
  - Data sync on reconnect

- **[Push Notifications](./src/utils/PUSH_NOTIFICATIONS.md)** - Notification support
  - useWebNotification hook
  - Permission handling
  - Backend integration requirements
  - Browser support

## Development Workflow

### Setup

1. **Create local environment file:**
   ```bash
   cp .env.example .env.local
   ```
   
2. **Enable mock data mode** (for UI development without backend):
   ```bash
   # In .env.local
   VITE_MOCK_DATA=true
   ```
   
3. **Install dependencies:**
   ```bash
   bun install
   ```

### Daily Development
1. Check tasks: `backlog task list`
2. Start dev server: `bun vite` (uses .env.local automatically)
3. Make changes
4. Test: `bun run test && bun run lint`
5. Commit and push

### Mock Data vs Real API

**Mock Mode** (`VITE_MOCK_DATA=true`):
- Uses TanStack DB local-only collections
- Data generated with Faker.js
- No backend required
- Perfect for UI development and prototyping

**Production Mode** (`VITE_MOCK_DATA=false` or unset):
- Connects to real backend API
- Requires server running on localhost:3000
- Uses TanStack Query for data fetching

### Code Quality
- TypeScript strict mode enabled
- ESLint with strict rules
- No type assertions allowed
- Functional programming patterns
- Arrow functions for components

### Path Aliases
All imports use `#` prefix:
```typescript
import { Alert } from '#alerts/types'
import { useAlerts } from '#alerts/useAlerts'
import { LoadingState } from '#components/feedback/LoadingState'
```

## Architecture Decisions

### Why SolidJS?
- Fine-grained reactivity (no virtual DOM)
- Excellent performance
- Small bundle size
- TypeScript support
- Similar to React (easy learning curve)

### Why Ionic?
- Mobile-first components
- Cross-platform (iOS, Android, Web)
- Built-in accessibility
- Professional UI
- PWA support

### Why TanStack Query?
- Automatic caching
- Request deduplication
- Background refetching
- Offline support
- DevTools

### Why Vite?
- Fast dev server (HMR)
- Optimized production builds
- Plugin ecosystem
- TypeScript support
- Modern tooling

## Common Tasks

### Add New Feature Module
1. Create directory: `src/feature/`
2. Add types: `feature/types.ts`
3. Add hooks: `feature/useFeature.ts`
4. Add page: `feature/Page.tsx`
5. Add route: `Router.tsx`
6. Add path alias: `tsconfig.json` and `vite.config.ts`

### Add New Component
1. Create file: `components/MyComponent.tsx`
2. Export from index if shared
3. Add tests: `components/__tests__/MyComponent.test.tsx`
4. Document usage in JSDoc

### Add New API Endpoint
1. Update OpenAPI schema (backend)
2. Regenerate types: `bun run generate:api`
3. Create hook in `useFeature.ts`
4. Use in component

## Deployment

### Production Build
```bash
bun run build
# Output: ../cmd/client/
```

### Environment Variables
```bash
# .env.production
VITE_API_URL=https://api.agentx.com
```

### PWA Deployment
- Service worker automatically registered
- Manifest included in build
- Icons and assets cached
- Offline support enabled

## Maintenance

### Update Dependencies
```bash
bun update
```

### Regenerate API Types
```bash
bun run generate:api
```

### Clean Build
```bash
rm -rf dist node_modules
bun install
bun run build
```

## Getting Help

- Read this guide and linked documentation
- Check existing code for patterns
- Review backlog tasks for context
- Ask team for code review
