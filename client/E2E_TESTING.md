# E2E Testing Strategy

## Overview

End-to-end testing ensures critical user flows work correctly. This document outlines the testing strategy for AgentX.

## Testing Framework

### Playwright

**Why Playwright:**
- Cross-browser support (Chrome, Firefox, Safari)
- Mobile device emulation
- Network interception
- Auto-waiting for elements
- Screenshot and video recording
- Parallel test execution
- TypeScript support

**Installation:**
```bash
cd client
bun add -D @playwright/test
bunx playwright install
```

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Critical Test Paths

### 1. Authentication Flow

**Test: User Login**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can log in', async ({ page }) => {
  await page.goto('/')
  
  // Should redirect to login
  await expect(page).toHaveURL('/login')
  
  // Fill login form
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Should redirect to home
  await expect(page).toHaveURL('/')
  await expect(page.locator('ion-title')).toContainText('Home')
})

test('shows error on invalid credentials', async ({ page }) => {
  await page.goto('/login')
  
  await page.fill('[name="email"]', 'wrong@example.com')
  await page.fill('[name="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  
  // Should show error
  await expect(page.locator('ion-toast')).toBeVisible()
})
```

### 2. Alerts Management

**Test: Create Alert**
```typescript
// e2e/alerts.spec.ts
test('user can create signal alert', async ({ page }) => {
  await page.goto('/alerts')
  
  // Click create button
  await page.click('ion-fab-button')
  await page.click('text=Signal Alert')
  
  // Fill form
  await page.fill('[name="name"]', 'BTC Alert')
  await page.fill('[name="description"]', 'Bitcoin price alert')
  await page.check('[name="notifications.sendEmail"]')
  
  // Submit
  await page.click('button[type="submit"]')
  
  // Should redirect to alerts list
  await expect(page).toHaveURL('/alerts')
  await expect(page.locator('text=BTC Alert')).toBeVisible()
})

test('user can edit alert', async ({ page }) => {
  await page.goto('/alerts')
  
  // Click first alert
  await page.click('alert-card:first-child')
  
  // Click edit button
  await page.click('ion-button[aria-label="Edit"]')
  
  // Update name
  await page.fill('[name="name"]', 'Updated Alert Name')
  await page.click('button[type="submit"]')
  
  // Should show updated name
  await expect(page.locator('text=Updated Alert Name')).toBeVisible()
})

test('user can delete alert', async ({ page }) => {
  await page.goto('/alerts')
  
  const alertName = await page.locator('alert-card:first-child ion-card-title').textContent()
  
  // Click delete button
  await page.click('alert-card:first-child ion-button[color="danger"]')
  
  // Confirm deletion
  page.on('dialog', dialog => dialog.accept())
  
  // Alert should be removed
  await expect(page.locator(`text=${alertName}`)).not.toBeVisible()
})
```

### 3. Strategy Builder

**Test: Create Strategy**
```typescript
// e2e/strategies.spec.ts
test('user can create strategy', async ({ page }) => {
  await page.goto('/strategies')
  
  // Click create button
  await page.click('ion-fab-button')
  
  // Fill form
  await page.fill('[name="name"]', 'Trend Following')
  await page.fill('[name="description"]', 'Follow the trend')
  await page.selectOption('[name="triggerAlert"]', 'alert-123')
  
  // Add action
  await page.click('text=Add Action')
  await page.selectOption('[name="actionType"]', 'open_position')
  
  // Submit
  await page.click('button[type="submit"]')
  
  // Should redirect to strategies list
  await expect(page).toHaveURL('/strategies')
  await expect(page.locator('text=Trend Following')).toBeVisible()
})
```

### 4. Watchlist Management

**Test: Add to Watchlist**
```typescript
// e2e/watchlist.spec.ts
test('user can add ticker to watchlist', async ({ page }) => {
  await page.goto('/watchlist')
  
  // Click add button
  await page.click('ion-fab-button')
  
  // Fill form
  await page.fill('[name="symbol"]', 'AAPL')
  await page.selectOption('[name="bias"]', 'bullish')
  
  // Submit
  await page.click('button[type="submit"]')
  
  // Should show in list
  await expect(page.locator('text=AAPL')).toBeVisible()
})
```

### 5. Real-Time Updates (SSE)

**Test: SSE Connection**
```typescript
// e2e/realtime.spec.ts
test('receives real-time updates', async ({ page }) => {
  await page.goto('/history')
  
  // Wait for SSE connection
  await page.waitForResponse(resp => 
    resp.url().includes('/api/events') && resp.status() === 200
  )
  
  // Trigger event from backend (mock or test endpoint)
  // ...
  
  // Should see new event in list
  await expect(page.locator('history-card:first-child')).toBeVisible()
})
```

### 6. Navigation Flows

**Test: Tab Navigation**
```typescript
// e2e/navigation.spec.ts
test('user can navigate between tabs', async ({ page }) => {
  await page.goto('/')
  
  // Navigate to alerts
  await page.click('ion-tab-button[tab="alerts"]')
  await expect(page).toHaveURL('/alerts')
  
  // Navigate to strategies
  await page.click('ion-tab-button[tab="strategies"]')
  await expect(page).toHaveURL('/strategies')
  
  // Navigate to watchlist
  await page.click('ion-tab-button[tab="watchlist"]')
  await expect(page).toHaveURL('/watchlist')
})
```

## Test Organization

### Directory Structure
```
client/
├── e2e/
│   ├── auth.spec.ts
│   ├── alerts.spec.ts
│   ├── strategies.spec.ts
│   ├── watchlist.spec.ts
│   ├── news.spec.ts
│   ├── settings.spec.ts
│   ├── navigation.spec.ts
│   ├── realtime.spec.ts
│   └── fixtures/
│       ├── test-data.ts
│       └── test-helpers.ts
├── playwright.config.ts
└── package.json
```

### Test Helpers

**Authentication Helper:**
```typescript
// e2e/fixtures/test-helpers.ts
export async function login(page: Page) {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
}
```

**Data Fixtures:**
```typescript
// e2e/fixtures/test-data.ts
export const testAlert = {
  name: 'Test Alert',
  type: 'signal',
  notifications: {
    sendEmail: true,
  },
}

export const testStrategy = {
  name: 'Test Strategy',
  description: 'Test description',
  triggerAlert: 'alert-123',
  actionChain: [],
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Install Playwright
        run: bunx playwright install --with-deps
      
      - name: Run E2E tests
        run: bun run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Package Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

## Best Practices

### 1. Use Data Test IDs
```tsx
<IonButton data-testid="create-alert-btn">
  Create Alert
</IonButton>
```

```typescript
await page.click('[data-testid="create-alert-btn"]')
```

### 2. Wait for Network Requests
```typescript
await page.waitForResponse(resp => 
  resp.url().includes('/api/alerts') && resp.status() === 200
)
```

### 3. Use Page Object Model
```typescript
// e2e/pages/alerts.page.ts
export class AlertsPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/alerts')
  }
  
  async createAlert(name: string) {
    await this.page.click('ion-fab-button')
    await this.page.fill('[name="name"]', name)
    await this.page.click('button[type="submit"]')
  }
}
```

### 4. Isolate Tests
```typescript
test.beforeEach(async ({ page }) => {
  // Reset database state
  await page.request.post('/api/test/reset')
})
```

### 5. Handle Flaky Tests
```typescript
test('flaky test', async ({ page }) => {
  // Use auto-waiting
  await expect(page.locator('text=Loading')).not.toBeVisible()
  
  // Use explicit waits
  await page.waitForSelector('[data-testid="content"]')
})
```

## Test Coverage Goals

### Critical Paths (Must Have)
- ✅ User authentication
- ✅ Alert CRUD operations
- ✅ Strategy CRUD operations
- ✅ Watchlist management
- ✅ Navigation flows

### Important Paths (Should Have)
- ⚠️ Settings management
- ⚠️ News feed
- ⚠️ Analytics dashboard
- ⚠️ Real-time updates
- ⚠️ Offline mode

### Nice to Have
- ⚠️ Form validation
- ⚠️ Error handling
- ⚠️ Mobile responsiveness
- ⚠️ Accessibility
- ⚠️ Performance

## Running Tests

### Local Development
```bash
# Run all tests
bun run test:e2e

# Run specific test file
bun run test:e2e e2e/alerts.spec.ts

# Run in UI mode
bun run test:e2e:ui

# Debug mode
bun run test:e2e:debug

# Run in headed mode (see browser)
bun run test:e2e:headed
```

### CI Environment
```bash
# Run with retries
bun run test:e2e --retries=2

# Generate HTML report
bun run test:e2e --reporter=html

# Run specific browser
bun run test:e2e --project=chromium
```

## Current Status

**Implementation Status:** Not yet implemented

**Next Steps:**
1. Install Playwright
2. Create playwright.config.ts
3. Write authentication tests
4. Write alerts CRUD tests
5. Write strategy tests
6. Add CI integration
7. Expand coverage

**Estimated Effort:** 2-3 days for critical paths

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Ionic Apps](https://ionicframework.com/docs/developing/testing)
- [SolidJS Testing](https://www.solidjs.com/guides/testing)
