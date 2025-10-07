# Firebase Real-Time Notifications System

## Overview

This document describes the implementation of Firebase real-time notifications using `onSnapshot` listeners for all four user roles in the collection management system. The system provides instant notifications for relevant activities based on each user's role and permissions.

## Architecture

### Core Components

1. **RealTimeNotificationService** (`/src/services/realtime-notifications.ts`)
   - Singleton service that manages Firebase onSnapshot listeners
   - Handles role-specific notification logic
   - Provides cleanup mechanisms for listeners

2. **NotificationService** (`/src/services/notification-service.ts`)
   - Manages notification state and callbacks
   - Provides notification creation methods
   - Handles notification lifecycle (add, read, remove)

3. **Dashboard Components**
   - Each dashboard component integrates with the real-time service
   - Listens for role-specific notifications
   - Updates UI in real-time

## Role-Specific Notifications

### 1. Super Admin

**Listens to:** All activities across all tenants

**Notifications Received:**
- **Payment Activities**: All completed payments across the system
- **Invoice Creation**: New invoices created by any wholesaler
- **User Management**: New user creation, role changes, updates
- **System Events**: Tenant status changes, system-wide activities

**Firebase Collections Monitored:**
- `payments` - All payment documents
- `invoices` - All invoice documents  
- `users` - All user documents

**Implementation:**
```typescript
realtimeNotificationService.startListening(
  user.uid,
  'SUPER_ADMIN',
  'system', // Listens to all tenants
  (newNotifications) => {
    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }
);
```

### 2. Wholesaler Admin

**Listens to:** Activities within their tenant only

**Notifications Received:**
- **Payment Collections**: Successful and failed payments by line workers
- **Invoice Creation**: New invoices created for retailers
- **Line Worker Activities**: Assignment changes, status updates
- **Retailer Activities**: New retailer registrations, updates

**Firebase Collections Monitored:**
- `payments` - Payments within tenant (filtered by tenantId)
- `invoices` - Invoices within tenant (filtered by tenantId)
- `users` - Line workers within tenant (filtered by tenantId and role)

**Implementation:**
```typescript
realtimeNotificationService.startListening(
  user.uid,
  'WHOLESALER_ADMIN',
  user.tenantId,
  (newNotifications) => {
    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }
);
```

### 3. Line Worker

**Listens to:** Personal activities and assignments

**Notifications Received:**
- **Payment Completion**: Successful payments they've collected
- **Payment Failures**: Failed payment attempts
- **New Assignments**: New retailers or areas assigned to them
- **Milestones**: Achievement notifications (payments collected, amounts reached)

**Firebase Collections Monitored:**
- `payments` - Payments made by this line worker (filtered by lineWorkerId)
- `users` - Their own user document for assignment changes

**Implementation:**
```typescript
realtimeNotificationService.startListening(
  user.uid,
  'LINE_WORKER',
  user.tenantId,
  (newNotifications) => {
    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }
);
```

### 4. Retailer

**Listens to:** Invoice and payment activities related to their account

**Notifications Received:**
- **New Invoices**: As soon as wholesalers create them
- **Successful Payments**: Payments completed by line workers with amount and time
- **OTP Notifications**: As soon as OTPs are sent by line workers
- **Payment Updates**: Status changes for their payments

**Firebase Collections Monitored:**
- `invoices` - Invoices for this retailer (filtered by retailerId)
- `payments` - Payments for this retailer (filtered by retailerId)
- `otps` - OTP activities for this retailer (filtered by retailerId)

**Implementation:**
```typescript
realtimeNotificationService.startListening(
  storedRetailerId,
  'RETAILER',
  'retailer', // Retailers use their own ID as tenant ID
  (newNotifications) => {
    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }
);
```

## Notification Types and Handlers

### Payment Notifications

**Super Admin:**
```typescript
private handleSuperAdminPaymentChange(payment: DocumentData, paymentId: string): void {
  if (payment.state === 'COMPLETED') {
    const notification = {
      type: 'success' as const,
      title: 'Payment Completed',
      message: `Payment of ₹${payment.totalPaid?.toLocaleString() || 0} completed by ${payment.lineWorkerName || 'Line Worker'} from ${payment.retailerName || 'Retailer'}`,
      timestamp: toDate(payment.createdAt),
      read: false,
      amount: payment.totalPaid,
      tenantId: payment.tenantId,
      workerName: payment.lineWorkerName,
      retailerName: payment.retailerName
    };
    this.addNotificationToService(notification);
  }
}
```

**Wholesaler Admin:**
```typescript
private handleWholesalerPaymentChange(payment: DocumentData, paymentId: string, tenantId: string): void {
  if (payment.state === 'COMPLETED') {
    const notification = {
      type: 'success' as const,
      title: 'Payment Collected',
      message: `${payment.lineWorkerName || 'Line Worker'} collected ₹${payment.totalPaid?.toLocaleString() || 0} from ${payment.retailerName || 'Retailer'}`,
      timestamp: toDate(payment.createdAt),
      read: false,
      amount: payment.totalPaid,
      workerName: payment.lineWorkerName,
      retailerName: payment.retailerName,
      collectionTime: formatTimestampWithTime(payment.createdAt)
    };
    this.addNotificationToService(notification);
  }
}
```

**Line Worker:**
```typescript
private handleLineWorkerPaymentChange(payment: DocumentData, paymentId: string, lineWorkerId: string): void {
  if (payment.state === 'COMPLETED') {
    const notification = {
      type: 'success' as const,
      title: 'Payment Collected Successfully',
      message: `Successfully collected ₹${payment.totalPaid?.toLocaleString() || 0} from ${payment.retailerName || 'Retailer'}`,
      timestamp: toDate(payment.createdAt),
      read: false,
      amount: payment.totalPaid,
      retailerName: payment.retailerName,
      paymentId: paymentId
    };
    this.addNotificationToService(notification);
  }
}
```

**Retailer:**
```typescript
private handleRetailerPaymentChange(payment: DocumentData, paymentId: string, retailerId: string): void {
  if (payment.state === 'COMPLETED') {
    const notification = {
      type: 'success' as const,
      title: 'Payment Received',
      message: `Payment of ₹${payment.totalPaid?.toLocaleString() || 0} received from ${payment.lineWorkerName || 'Line Worker'}`,
      timestamp: toDate(payment.createdAt),
      read: false,
      amount: payment.totalPaid,
      workerName: payment.lineWorkerName,
      collectionTime: formatTimestampWithTime(payment.createdAt)
    };
    this.addNotificationToService(notification);
  }
}
```

### Invoice Notifications

**Super Admin:**
```typescript
private handleSuperAdminInvoiceChange(invoice: DocumentData, invoiceId: string): void {
  const notification = {
    type: 'info' as const,
    title: 'New Invoice Created',
    message: `Invoice #${invoice.invoiceNumber} for ₹${invoice.totalAmount?.toLocaleString() || 0} created for ${invoice.retailerName || 'Retailer'}`,
    timestamp: toDate(invoice.issueDate),
    read: false,
    amount: invoice.totalAmount,
    tenantId: invoice.tenantId,
    retailerName: invoice.retailerName
  };
  this.addNotificationToService(notification);
}
```

**Wholesaler Admin:**
```typescript
private handleWholesalerInvoiceChange(invoice: DocumentData, invoiceId: string, tenantId: string): void {
  const notification = {
    type: 'info' as const,
    title: 'New Invoice Created',
    message: `Invoice #${invoice.invoiceNumber} for ₹${invoice.totalAmount?.toLocaleString() || 0} created for ${invoice.retailerName || 'Retailer'}`,
    timestamp: toDate(invoice.issueDate),
    read: false,
    amount: invoice.totalAmount,
    retailerName: invoice.retailerName
  };
  this.addNotificationToService(notification);
}
```

**Retailer:**
```typescript
private handleRetailerInvoiceChange(invoice: DocumentData, invoiceId: string, retailerId: string): void {
  const notification = {
    type: 'info' as const,
    title: 'New Invoice Received',
    message: `New invoice #${invoice.invoiceNumber} for ₹${invoice.totalAmount?.toLocaleString() || 0} has been created`,
    timestamp: toDate(invoice.issueDate),
    read: false,
    amount: invoice.totalAmount,
    invoiceNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate ? formatTimestampWithTime(invoice.dueDate) : undefined
  };
  this.addNotificationToService(notification);
}
```

### OTP Notifications (Retailer Only)

```typescript
private handleRetailerOtpChange(otp: DocumentData, otpId: string, retailerId: string): void {
  if (otp.status === 'SENT') {
    const notification = {
      type: 'info' as const,
      title: 'OTP Sent',
      message: `OTP has been sent for payment verification`,
      timestamp: toDate(otp.createdAt),
      read: false,
      otpId: otpId,
      paymentId: otp.paymentId
    };
    this.addNotificationToService(notification);
  } else if (otp.status === 'VERIFIED') {
    const notification = {
      type: 'success' as const,
      title: 'OTP Verified',
      message: `OTP has been successfully verified for payment`,
      timestamp: toDate(otp.createdAt),
      read: false,
      otpId: otpId,
      paymentId: otp.paymentId
    };
    this.addNotificationToService(notification);
  }
}
```

## Integration Points

### Dashboard Components

Each dashboard component integrates the real-time notification service in its `useEffect`:

```typescript
useEffect(() => {
  if (isSuperAdmin && user) {
    fetchTenants();
    fetchAnalytics();
    fetchRecentActivities();
    
    // Start real-time notifications
    realtimeNotificationService.startListening(
      user.uid,
      'SUPER_ADMIN',
      'system',
      (newNotifications) => {
        setNotifications(newNotifications);
        setNotificationCount(newNotifications.filter(n => !n.read).length);
      }
    );
  }

  // Cleanup on unmount
  return () => {
    if (user) {
      realtimeNotificationService.stopListening(user.uid);
    }
  };
}, [isSuperAdmin, user, activeNav]);
```

### Notification UI

The `DashboardNavigation` component displays notifications with:

- **Real-time updates**: Instant UI updates when new notifications arrive
- **Role-specific filtering**: Only relevant notifications shown to each role
- **Rich content**: Amounts, timestamps, worker names, and other contextual information
- **Interactive elements**: Mark as read, remove notifications

## Security and Performance

### Security Considerations

1. **Tenant Isolation**: Each role only receives notifications for their tenant (except Super Admin)
2. **User Filtering**: Notifications are filtered by user ID for line workers and retailers
3. **Role-Based Access**: Listeners are set up based on user roles
4. **Cleanup**: Proper cleanup prevents memory leaks and unnecessary API calls

### Performance Optimizations

1. **Efficient Queries**: Firebase queries use appropriate indexes and filters
2. **Limited Data**: Only relevant fields are monitored and processed
3. **Debouncing**: Rapid successive changes are handled efficiently
4. **Memory Management**: Proper cleanup of listeners when components unmount

## Error Handling

The system includes comprehensive error handling:

```typescript
onSnapshot(
  query,
  (snapshot) => {
    // Process changes
  },
  (error) => {
    console.error('Error listening to payments:', error);
  }
);
```

## Testing and Debugging

### Debug Logging

The service includes detailed logging for debugging:

```typescript
console.log('🔔 Starting Super Admin notification listeners');
console.log('🔔 Starting Wholesaler Admin notification listeners for tenant:', tenantId);
console.log('🔔 Starting Line Worker notification listeners for user:', userId);
console.log('🔔 Starting Retailer notification listeners for user:', userId);
```

### Common Issues

1. **Permission Errors**: Ensure Firebase security rules allow read access
2. **Missing Data**: Verify that required fields exist in documents
3. **Listener Cleanup**: Ensure listeners are properly cleaned up
4. **Network Issues**: Handle offline/online transitions gracefully

## Future Enhancements

### Potential Improvements

1. **Push Notifications**: Integrate with Firebase Cloud Messaging for mobile push notifications
2. **Notification Preferences**: Allow users to customize notification types
3. **Email Notifications**: Add email notifications for critical events
4. **Notification Analytics**: Track notification delivery and engagement metrics
5. **Batch Processing**: Group multiple notifications into summaries

### Scalability Considerations

1. **Large Tenant Bases**: Implement pagination for Super Admin notifications
2. **High Activity**: Implement rate limiting for very active tenants
3. **Cross-Region Support**: Consider multi-region deployment for global scalability
4. **Offline Support**: Add offline notification queueing and syncing

## Conclusion

The Firebase real-time notification system provides instant, role-specific notifications for all users in the collection management system. By leveraging Firebase's `onSnapshot` listeners, the system ensures that users receive timely updates about relevant activities without requiring manual refreshes or polling.

The implementation is modular, secure, and performant, with proper cleanup mechanisms and comprehensive error handling. Each user role receives notifications tailored to their specific needs and permissions, creating an efficient and user-friendly experience.