# TODO: FCM Notification Deep Linking Implementation

User requested to save this plan for later execution.

## Goal
Ensure that clicking an FCM notification (specifically for Wholesalers) opens the app and auto-navigates to the "Transactions" tab.

## Implementation Steps

### 1. WholesalerAdminDashboard.tsx
- **Import**: Add `useSearchParams` from `next/navigation`.
- **Logic**: Add logic to read `?tab=transactions` query parameter.
- **Code Snippet**:
  ```typescript
  import { useSearchParams } from 'next/navigation';
  
  // Inside Component
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['transactions', 'overview', 'retailers'].includes(tab)) {
      setActiveNav(tab);
    }
  }, [searchParams]);
  ```

### 2. firebase-messaging-sw.js
- **Problem**: Current logic prioritizes `data.type === 'payment'` which hardcodes the path to `/retailer/payment-history`.
- **Fix**: Update `notificationclick` handler to PRIORITIZE `data.url`.
- **Code Snippet**:
  ```javascript
  self.addEventListener('notificationclick', (event) => {
    const data = event.notification.data || {};
    // PRIORITY FIX: specific url overrides type logic
    const urlToOpen = data.url || (data.type === 'payment' ? '/retailer/payment-history' : '/');
    
    // ... existing logic ...
    // BUT ensure urlToOpen is used if defined, or move the 'payment' check to be a fallback
  });
  ```

### 3. Backend Payload
Ensure backend sends:
```json
{
  "data": {
    "url": "/?tab=transactions",
    "type": "payment" 
  }
}
```
*Note: If backend sends `url`, the SW fix above ensures it is used.*
