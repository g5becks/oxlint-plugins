# Using Declaration Documentation Updates for README.md

This file contains all the documentation updates needed for the `using` declaration support.
Merge these sections into the main README.md.

---

## Update 1: Server-Sent Events Features Section

**Location:** Server-Sent Events (SSE) → Features

**Change:**
```markdown
### Features

- ✅ Reactive connection state and data streams
- ✅ Automatic reconnection with configurable retry logic
- ✅ Support for custom event types
- ✅ Auto-cleanup on component unmount
- ✅ **`using` declaration support** for automatic resource management  ← ADD THIS
- ✅ Manual reconnect capability
- ✅ Full TypeScript support
```

---

## Update 2: SSE Quick Start Section

**Location:** Server-Sent Events (SSE) → Quick Start

**Replace entire section with:**

### Quick Start

#### Traditional Approach (with `onCleanup`)

```typescript
import { useEventSource } from '#utils/use-event-source'
import { createEffect, onCleanup } from 'solid-js'

const MyComponent = () => {
  const { data, status, close } = useEventSource('/api/events')

  // Watch for new data
  createEffect(() => {
    console.log('New data:', data())
    console.log('Status:', status())
  })

  // Manual cleanup
  onCleanup(() => {
    close()
  })

  return (
    <div>
      <p>Status: {status()}</p>
      <p>Latest data: {data()}</p>
    </div>
  )
}
```

#### Modern Approach (with `using` declaration)

```typescript
import { useEventSource } from '#utils/use-event-source'
import { createEffect } from 'solid-js'

const MyComponent = () => {
  const handleConnect = () => {
    try {
      // Automatically disposed when scope exits
      using eventSource = useEventSource('/api/events', [], {
        autoReconnect: true,
        maxReconnectAttempts: 5,
      })

      // Watch for new data
      createEffect(() => {
        console.log('New data:', eventSource.data())
        console.log('Status:', eventSource.status())
      })
    } catch (err) {
      console.error('Connection error:', err)
    }
    // Resource automatically cleaned up here
  }

  return <button onClick={handleConnect}>Connect</button>
}
```

---

## Update 3: SSE API Reference Return Type

**Location:** Server-Sent Events (SSE) → API Reference → Returns

**Add this line:**
```typescript
{
  // ... existing fields
  [Symbol.dispose]: () => void  // ← ADD THIS - Dispose method for 'using' declaration
}
```

---

## Update 4: SSE Usage Examples - Add Using Declaration Patterns

**Location:** Server-Sent Events (SSE) → Usage Examples

**Add after "Manual Reconnection" example:**

#### Using Declaration Patterns

**Multiple resources (disposed in reverse order):**
```typescript
try {
  using notification = useWebNotification({ title: 'Connecting...' })
  using eventSource = useEventSource('/api/events')
  
  // Use both resources...
  await notification.show()
} catch (err) {
  console.error(err)
}
// Disposed in reverse order: eventSource, then notification
```

**Optional resources:**
```typescript
const shouldConnect = checkCondition()

try {
  // Works with null/undefined
  using maybeSource = shouldConnect 
    ? useEventSource('/api/events')
    : null
  
  if (maybeSource) {
    console.log('Connected:', maybeSource.status())
  }
} catch (err) {
  console.error(err)
}
```

**In loops (disposed per iteration):**
```typescript
const endpoints = ['/api/prices', '/api/alerts', '/api/news']

for (const endpoint of endpoints) {
  try {
    using source = useEventSource(endpoint)
    console.log(`${endpoint}: ${source.status()}`)
    // Process data...
    // Disposed at end of each iteration
  } catch (err) {
    console.error(`Error with ${endpoint}:`, err)
  }
}
```

---

## Update 5: SSE Best Practices - Update Cleanup Guidance

**Location:** Server-Sent Events (SSE) → Best Practices → #1

**Replace first best practice with:**

1. **Choose cleanup approach based on context:**
   
   **Use `using` declaration when:**
   - Resources are scoped to a specific block or function
   - You want automatic cleanup
   - Working outside Solid.js reactive contexts
   
   ```typescript
   function fetchData() {
     using source = useEventSource('/api/data')
     // Automatically cleaned up on return/error
   }
   ```
   
   **Use `onCleanup` when:**
   - Resource lifetime matches component lifetime
   - Working within Solid.js components
   - Need reactive cleanup behavior
   
   ```typescript
   const MyComponent = () => {
     const { close } = useEventSource('/api/events')
     onCleanup(() => close())
   }
   ```

---

## Update 6: SSE Browser Support Section

**Location:** Server-Sent Events (SSE) → Behavior → Browser Support

**Add after existing browser support:**

5. **Using Declaration Support**
   - Chrome 123+, Node.js 22+
   - Transformed by Babel in this project for broader compatibility
   - Part of ECMAScript 2024 (ES15) proposal
   - See: [TC39 Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)

---

## Update 7: Web Notifications Features Section

**Location:** Web Notifications → Features

**Change:**
```markdown
### Features

- ✅ Automatic permission management with `@solid-primitives/permission`
- ✅ Reactive notification state
- ✅ Event hooks for click, show, error, and close events
- ✅ Auto-cleanup on component unmount
- ✅ **`using` declaration support** for automatic resource management  ← ADD THIS
- ✅ Auto-close when tab becomes visible
- ✅ Full TypeScript support
```

---

## Update 8: Web Notifications Quick Start

**Location:** Web Notifications → Quick Start

**Replace entire section with:**

### Quick Start

#### Traditional Approach

```typescript
import { useWebNotification } from '#utils/use-web-notification'
import { onCleanup } from 'solid-js'

const MyComponent = () => {
  const {
    isSupported,
    permission,
    show,
    close,
    onClick,
  } = useWebNotification({
    title: 'Agent X',
    body: 'This is a notification',
    icon: '/icon-192.png',
  })

  // Check if supported
  if (!isSupported()) {
    return <p>Notifications not supported</p>
  }

  // Listen to click
  onClick((evt) => {
    console.log('Notification clicked!')
    close()
  })

  // Manual cleanup
  onCleanup(() => close())

  return (
    <div>
      <p>Permission: {permission()}</p>
      <button onClick={() => void show()}>Show Notification</button>
    </div>
  )
}
```

#### With `using` Declaration

```typescript
import { useWebNotification } from '#utils/use-web-notification'

const MyComponent = () => {
  const handleShowNotification = async () => {
    try {
      // Automatically disposed when function exits
      using notification = useWebNotification({
        title: 'Agent X',
        body: 'This is a notification',
        icon: '/icon-192.png',
      })

      if (!notification.isSupported()) {
        alert('Notifications not supported')
        return
      }

      // Listen to click
      notification.onClick(() => {
        console.log('Notification clicked!')
        notification.close()
      })

      // Show notification
      await notification.show()
    } catch (err) {
      console.error('Notification error:', err)
    }
    // Automatically closed when scope exits
  }

  return <button onClick={handleShowNotification}>Show Notification</button>
}
```

---

## Update 9: Web Notifications API Reference

**Location:** Web Notifications → API Reference → Returns

**Add this line:**
```typescript
{
  // ... existing fields
  [Symbol.dispose]: () => void  // ← ADD THIS - Dispose method for 'using' declaration
}
```

---

## Update 10: Web Notifications Best Practices

**Location:** Web Notifications → Best Practices

**Add as #6:**

6. **Using declaration for scoped notifications:**
   ```typescript
   async function notifyUser(message: string) {
     using notification = useWebNotification({
       title: 'Alert',
       body: message,
     })
     
     await notification.show()
     // Automatically closed when function returns
   }
   ```

---

## Update 11: New Section - Explicit Resource Management

**Location:** Add before "Dependencies" section

## Explicit Resource Management (`using` Declaration)

This project includes support for the ECMAScript Explicit Resource Management proposal, enabling automatic cleanup of resources using the `using` declaration.

### What is `using`?

The `using` declaration automatically disposes resources when they go out of scope, similar to Python's `with` statement or C#'s `using` statement. It's part of the [TC39 Explicit Resource Management proposal](https://github.com/tc39/proposal-explicit-resource-management).

### How It Works

```typescript
{
  using resource = useEventSource('/api/events')
  // Use the resource...
  
  // When this block exits, resource[Symbol.dispose]() is called automatically
}
```

### Benefits

1. **Automatic Cleanup** - No need to remember `onCleanup` or manual `close()` calls
2. **Error Safety** - Resources disposed even if exceptions occur
3. **Correct Order** - Multiple resources disposed in reverse declaration order
4. **Null Safe** - Works with optional resources (`null` or `undefined`)
5. **Scoped Lifetime** - Resources tied to lexical scope

### Supported Utilities

Both utilities support `Symbol.dispose`:
- `useEventSource` - Automatically closes connection
- `useWebNotification` - Automatically closes notification

### Browser Support

- **Native Support**: Chrome 123+, Node.js 22+
- **This Project**: Uses `@babel/plugin-transform-explicit-resource-management` for broader compatibility
- **Spec Status**: Stage 3 proposal, included in ES2024

### Configuration

Already configured in `vite.config.ts`:

```typescript
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: ['@babel/plugin-transform-explicit-resource-management'],
      },
      filter: /\.[jt]sx?$/,
    }),
    // ...
  ],
})
```

### Examples

See `src/components/UsingDeclarationExample.tsx` for comprehensive examples demonstrating:
- Traditional vs `using` approach
- Multiple resources
- Optional resources
- Resources in loops
- Error handling

---

## Update 12: Dependencies Section

**Location:** Dependencies → Dev Dependencies

**Add these packages:**
```json
{
  "@babel/plugin-transform-explicit-resource-management": "^latest",
  "vite-plugin-babel": "^latest",
  // ... existing packages
}
```

---

## Summary of Changes

1. ✅ Added `using` declaration support to SSE features list
2. ✅ Added modern `using` approach to SSE Quick Start
3. ✅ Added `[Symbol.dispose]` to SSE return type
4. ✅ Added `using` declaration pattern examples for SSE
5. ✅ Updated SSE best practices with cleanup guidance
6. ✅ Added `using` browser support info to SSE
7. ✅ Added `using` declaration support to Web Notifications features
8. ✅ Added modern `using` approach to Web Notifications Quick Start
9. ✅ Added `[Symbol.dispose]` to Web Notifications return type
10. ✅ Added `using` best practice for Web Notifications
11. ✅ Added new "Explicit Resource Management" section
12. ✅ Updated dependencies list

## Files to Reference

- **Implementation**: `src/utils/use-event-source.ts`, `src/utils/use-web-notification.ts`
- **Examples**: `src/components/UsingDeclarationExample.tsx`
- **Config**: `vite.config.ts`
- **Tests**: All existing tests pass with new API
