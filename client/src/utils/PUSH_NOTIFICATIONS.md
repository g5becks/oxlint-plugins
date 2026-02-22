# Push Notification Support

## Overview

AgentX has comprehensive Web Notification API support via the `useWebNotification` hook. Full push notification support requires backend integration.

## Current Implementation

### useWebNotification Hook

Located in `client/src/utils/use-web-notification.ts`

**Features:**
- Permission request and management
- Reactive permission state
- Notification creation and display
- Event handlers (click, show, error, close)
- Auto-cleanup on unmount
- Auto-close on tab visibility
- TypeScript support with full type definitions

**Usage Example:**
```typescript
const { isSupported, permission, show, close, onClick } = useWebNotification({
  title: 'Alert Triggered',
  body: 'BTC crossed $50,000',
  icon: '/img/icon.png',
  requireInteraction: true,
})

// Check support
if (isSupported()) {
  // Show notification
  await show()
  
  // Handle click
  onClick(() => {
    console.log('User clicked notification')
    close()
  })
}
```

## Service Worker Integration

The PWA service worker (configured in `vite.config.ts`) is ready for push notifications:

**Current Capabilities:**
- Service worker registered and active
- Notification permission handling
- Local notifications work

**Requires Backend:**
- Push subscription management
- VAPID keys configuration
- Push message sending
- Subscription storage

## Backend Integration Required

To enable full push notifications:

### 1. VAPID Keys
Generate and configure VAPID keys for push service:
```bash
npx web-push generate-vapid-keys
```

### 2. Subscription Endpoint
Create API endpoint to store push subscriptions:
```typescript
POST /api/push/subscribe
{
  endpoint: string,
  keys: {
    p256dh: string,
    auth: string
  }
}
```

### 3. Push Service
Implement server-side push notification sending:
```typescript
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:support@agentx.com',
  publicVapidKey,
  privateVapidKey
)

// Send notification
await webpush.sendNotification(subscription, payload)
```

### 4. Service Worker Push Handler
Add to service worker:
```typescript
self.addEventListener('push', (event) => {
  const data = event.data.json()
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/img/badge.png',
      data: data.data,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})
```

## Use Cases

### Alert Notifications
- Price alerts triggered
- Strategy execution completed
- Position opened/closed
- Risk threshold exceeded

### System Notifications
- Connection restored
- Data sync completed
- Update available
- Maintenance scheduled

## Testing

### Local Notifications
1. Open app in browser
2. Grant notification permission
3. Trigger notification via UI
4. Verify notification appears
5. Click notification
6. Verify click handler works

### Push Notifications (Requires Backend)
1. Subscribe to push service
2. Send test push from backend
3. Verify notification received
4. Test notification actions
5. Test notification click

## Browser Support

**Web Notifications:**
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile iOS 16.4+)
- ✅ Opera

**Push API:**
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ⚠️ Safari (Desktop only, iOS requires app)
- ✅ Opera

## Security Considerations

- HTTPS required for push notifications
- User must grant permission
- Permissions can be revoked
- Rate limiting on backend
- Validate push subscriptions
- Encrypt sensitive data in push payloads

## Future Enhancements

- [ ] Backend push service implementation
- [ ] VAPID keys configuration
- [ ] Subscription management UI
- [ ] Notification preferences per alert type
- [ ] Rich notifications with actions
- [ ] Notification grouping
- [ ] Silent notifications for background sync
- [ ] Badge count updates
