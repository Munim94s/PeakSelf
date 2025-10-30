# Error Boundary Implementation

## Overview

The ErrorBoundary component catches React component errors and provides a user-friendly fallback UI while logging errors to the backend for monitoring.

## Features

- **React Error Catching**: Catches errors in React component tree
- **User-Friendly Fallback UI**: Shows clean error message with action buttons
- **Backend Logging**: Logs errors to backend with unique error ID
- **Error Context**: Captures stack trace, component stack, user agent, URL, timestamp
- **Dev Mode Details**: Shows full error details in development
- **Recovery Options**: Try Again, Reload Page, Go Home buttons

## Implementation

### Frontend

**ErrorBoundary Component** (`client/src/components/ErrorBoundary.jsx`)
- Class component using `componentDidCatch` lifecycle
- Logs errors to `/api/errors/log` endpoint
- Returns unique error ID to display to user
- Provides three recovery options

**Integration** (`client/src/main.jsx`)
```jsx
<ErrorBoundary>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</ErrorBoundary>
```

### Backend

**Error Logging Route** (`server/routes/errors.js`)
- `POST /api/errors/log` - Logs frontend errors
- Generates unique error ID (UUID v4)
- Logs to Winston with full context
- No CSRF protection (errors can happen before token obtained)
- No rate limiting (critical errors need to be logged)

**Logged Information:**
- Error message
- Stack trace
- Component stack (React hierarchy)
- User agent
- URL where error occurred
- Timestamp
- IP address

## Testing

### Automated Tests

`server/__tests__/routes/errors.test.js` - 10 tests covering:
- Successful error logging
- Validation (missing message)
- Minimal data handling
- Full context logging
- IP address inclusion
- TypeError/ReferenceError handling
- Unique error ID generation
- Long messages
- Special characters

All tests pass: ✅ 366/366 total tests

### Manual Testing

**ErrorTest Component** (`client/src/components/ErrorTest.jsx`)
- Only renders in development mode
- Provides buttons to trigger different error types:
  - Sync error
  - Async error
  - TypeError
  - ReferenceError

**To Test Manually:**
1. Import `ErrorTest` in a development page
2. Click any error button
3. Verify ErrorBoundary displays fallback UI
4. Check console for error ID
5. Click "Try Again" to reset error state

## Usage

The ErrorBoundary is already integrated at the app root level. No additional setup needed.

### Triggering Errors (Development Only)

Add to any page in development:

```jsx
import ErrorTest from './components/ErrorTest';

function MyPage() {
  return (
    <div>
      {/* Your page content */}
      <ErrorTest />
    </div>
  );
}
```

### Error Logging Format

Errors are logged in Winston logs at `error` level:

```json
{
  "level": "error",
  "message": "Frontend Error:",
  "errorId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "TypeError: Cannot read property 'name' of null",
  "stack": "TypeError: Cannot read property 'name' of null\n  at Component...",
  "componentStack": "  at ErrorTest\n  at App",
  "userAgent": "Mozilla/5.0...",
  "url": "http://localhost:5173/",
  "timestamp": "2025-10-30T21:00:00.000Z",
  "ip": "::1"
}
```

## Error Recovery

The ErrorBoundary provides three recovery options:

1. **Try Again**: Resets error state, re-renders component
2. **Reload Page**: Full page reload (`window.location.reload()`)
3. **Go Home**: Navigates to home page (`window.location.href = '/'`)

## Production vs Development

### Production
- Shows user-friendly error message
- Displays error ID for support reference
- Error details hidden from user
- Errors logged to backend

### Development
- Shows user-friendly message
- Displays error ID
- **Additionally shows**: Full error stack, component stack in collapsible details
- Errors logged to console AND backend

## Benefits

✅ Prevents white screen of death
✅ Provides user-friendly error experience  
✅ Captures errors for debugging
✅ Maintains app navigation options
✅ Unique error IDs for support tickets
✅ Full error context for developers

## Future Enhancements

Potential improvements:
- Store errors in database table
- Admin dashboard for error monitoring
- Error aggregation and grouping
- Email notifications for critical errors
- Integration with error tracking services (Sentry, Rollbar)
- Source map support for production stack traces
