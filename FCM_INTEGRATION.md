# FCM (Firebase Cloud Messaging) Integration

This document outlines the FCM integration implemented for the pHLynk Next.js application to provide real-time push notifications for OTP and payment alerts.

## Overview

The FCM integration complements the existing PWA notification system by providing:
- Real-time notifications even when the app is in the background
- Cross-device notification support
- Reliable message delivery through Firebase's infrastructure
- Graceful fallback to PWA notifications when FCM is unavailable

## Architecture

### Core Components

1. **FCM Service (`/src/lib/fcm-service.ts`)**
   - Device token management
   - Notification sending logic
   - Device cleanup and maintenance

2. **FCM Client Library (`/src/lib/fcm.ts`)**
   - Client-side FCM initialization
   - Permission handling
   - Token registration

3. **API Routes**
   - `/api/fcm/register-device` - Register device tokens
   - `/api/fcm/unregister-device` - Unregister device tokens
   - `/api/fcm/send-otp` - Send OTP notifications
   - `/api/fcm/send-payment` - Send payment status notifications

4. **React Components**
   - `FCMNotificationManager` - Manages FCM initialization and message handling
   - `NotificationPermissionPrompt` - Elegant permission request UI

5. **Service Worker (`/public/firebase-messaging-sw.js`)**
   - Background message handling
   - Notification click management

## Setup Requirements

### Environment Variables

Add these to your `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# FCM Configuration
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key
FCM_SERVER_KEY=your_server_key
```

### Firebase Project Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Cloud Messaging in your project settings
3. Generate a VAPID key pair in Project Settings > Cloud Messaging
4. Get your Server Key from Project Settings > Cloud Messaging
5. Configure your web app in Firebase project settings

## Usage

### Automatic Integration

The FCM system is automatically integrated through:
- `FCMNotificationManager` in the main layout (`/src/app/layout.tsx`)
- `NotificationPermissionPrompt` for user-friendly permission requests
- Automatic device registration on user authentication

### Manual Usage

#### Sending OTP Notifications

```typescript
import { sendOTPViaFCM } from '@/lib/fcm-service';

const result = await sendOTPViaFCM(
  retailerId,
  '123456', // OTP
  'Retailer Name',
  'payment-123', // Payment ID
  1000 // Amount
);
```

#### Sending Payment Notifications

```typescript
import { sendPaymentNotificationViaFCM } from '@/lib/fcm-service';

const result = await sendPaymentNotificationViaFCM(
  retailerId,
  'payment-123',
  'completed', // 'completed' | 'failed' | 'pending'
  1000, // Amount
  'Customer Name' // Optional
);
```

#### Managing Device Tokens

```typescript
import { fcmService } from '@/lib/fcm-service';

// Register a device
await fcmService.registerDevice(retailerId, token, userAgent);

// Unregister a device
await fcmService.unregisterDevice(retailerId, token);

// Get all devices for a retailer
const devices = await fcmService.getRetailerDevices(retailerId);
```

## Notification Types

### OTP Notifications
- **Title**: "🔐 OTP Verification Required"
- **Body**: Contains the OTP code
- **Data**: Includes retailer ID, payment ID, amount, and OTP
- **Click Action**: Opens retailer dashboard

### Payment Notifications
- **Completed**: "✅ Payment Completed"
- **Failed**: "❌ Payment Failed"
- **Pending**: "⏳ Payment Pending"
- **Data**: Includes payment ID, status, amount, customer name
- **Click Action**: Opens payment details or dashboard

## Features

### Multi-Device Support
- Each retailer can register multiple devices
- Notifications are sent to all active devices
- Automatic cleanup of inactive devices (30+ days)

### Graceful Degradation
- Falls back to PWA notifications if FCM fails
- Continues to work even if Firebase is unavailable
- User-friendly error handling

### Permission Management
- Elegant permission request UI
- Automatic detection of notification support
- Debug tools for troubleshooting

### Security
- Token-based authentication
- Server-side validation
- Automatic token cleanup on logout

## Troubleshooting

### Debug Tools

The `FCMNotificationManager` component includes debug functionality:
- **Debug FCM Status Button**: Shows current FCM configuration
- **Test Notification**: Sends a test notification
- **Console Logging**: Detailed logging for troubleshooting

### Common Issues

1. **FCM Not Supported**
   - Check browser compatibility
   - Ensure HTTPS is enabled (required for service workers)
   - Verify Firebase configuration

2. **Permission Denied**
   - Users must manually enable in browser settings
   - Provide clear instructions for enabling notifications

3. **Token Registration Fails**
   - Check Firebase project configuration
   - Verify VAPID key setup
   - Ensure service worker is properly registered

4. **Notifications Not Received**
   - Check device token registration
   - Verify FCM server key configuration
   - Check notification payload format

### Browser Support

FCM supports:
- Chrome (desktop and mobile)
- Firefox (desktop and mobile)
- Safari (desktop and mobile)
- Edge (desktop and mobile)

## Integration with Existing Systems

### PWA Notifications
- FCM complements, doesn't replace PWA notifications
- Automatic fallback ensures reliability
- Both systems can work simultaneously

### OTP System
- Integrated into existing OTP sending flow
- Maintains compatibility with current OTP delivery methods
- Adds real-time delivery capability

### Payment System
- Integrated into payment status updates
- Provides immediate feedback for payment events
- Enhances user experience with real-time updates

## Performance Considerations

- Device tokens are cached for efficiency
- Automatic cleanup prevents database bloat
- Batch processing for multiple devices
- Minimal impact on existing functionality

## Security Notes

- Server keys are stored securely in environment variables
- Token validation prevents unauthorized access
- User authentication required for device registration
- Automatic token cleanup on logout

## Future Enhancements

- Notification templates for different message types
- Analytics for notification delivery
- User notification preferences
- Scheduled notifications
- Notification grouping