# 📋 **Firebase Functions Overview**

| Function Name | When Called | Primary Operation | Input Data | Output/Result |
|---------------|-------------|-------------------|------------|---------------|
| **`sendFCMNotification`** | Line worker initiates payment | Sends push notification to retailer's device | `retailerId`, `notification` object with title, body, data | Success/failure status, message ID |
| **`sendFCMOTPNotification`** | *(Backup/Alternative)* | Enhanced OTP notification with retailer lookup | `retailerId`, `otp`, `amount`, `paymentId`, `lineWorkerName` | Success/failure, FCM message ID |
| **`sendRetailerPaymentSMS`** | OTP verification successful | Sends SMS confirmation to retailer | `retailerId`, `amount`, `paymentId`, `retailerName` | SMS delivery status, Fast2SMS response |
| **`sendWholesalerPaymentSMS`** | OTP verification successful | Sends SMS confirmation to wholesaler | `wholesalerId`, `amount`, `paymentId`, `retailerName` | SMS delivery status, Fast2SMS response |
| **`sendPaymentCompletionNotification`** | Payment marked as completed | Sends completion notifications | `retailerId`, `amount`, `paymentId`, `paymentData` | Success/failure of all notification channels |
| **`sendOTPNotification`** | *(Legacy/Backup)* | Original OTP notification method | `retailerId`, `otp`, `paymentData` | Legacy notification status |
| **`sendTestFCMNotification`** | Manual testing | Test FCM connectivity | User's FCM token | Test notification result |
| **`processSMSResponse`** | Fast2SMS webhook | Process SMS delivery reports | `url`, SMS response data | Processing status, logs |

---

## 🔄 **Complete Payment Flow Function Calls**

### **1. Payment Initiation Flow**
```
Line Worker Initiates Payment
    ↓
Frontend calls: /api/otp/send
    ↓
Backend calls: sendFCMNotification (Push to retailer)
    ↓
Result: Retailer gets OTP notification
```

### **2. OTP Verification Flow**
```
Retailer Enters OTP
    ↓
Frontend calls: /api/otp/verify
    ↓
Backend calls (in parallel):
    ├── sendRetailerPaymentSMS (SMS to retailer)
    └── sendWholesalerPaymentSMS (SMS to wholesaler)
    ↓
Result: Both parties get SMS confirmation
```

### **3. Payment Completion Flow**
```
Payment Marked Complete
    ↓
Backend calls: sendPaymentCompletionNotification
    ↓
Sends completion notifications via multiple channels
    ↓
Result: All parties notified of completion
```

---

## 📊 **Function Dependencies & Relationships**

| Function | Calls/Triggers | Dependencies | Fallback Options |
|----------|----------------|--------------|------------------|
| **`sendFCMNotification`** | `/api/otp/send` | Firebase Admin, FCM tokens | Local FCM service, Dashboard display |
| **`sendRetailerPaymentSMS`** | `/api/otp/verify` | Fast2SMS API, Retailer data | None (critical) |
| **`sendWholesalerPaymentSMS`** | `/api/otp/verify` | Fast2SMS API, Wholesaler data | None (critical) |
| **`sendPaymentCompletionNotification`** | Payment completion | All notification services | Multiple fallback channels |
| **`sendFCMOTPNotification`** | *(Alternative)* | Enhanced retailer lookup | Standard FCM notification |
| **`sendOTPNotification`** | *(Legacy)* | Basic notification data | Newer FCM functions |
| **`sendTestFCMNotification`** | Manual testing | User's FCM token | None (testing only) |
| **`processSMSResponse`** | Fast2SMS webhook | Fast2SMS response format | Error logging |

---

## 🎯 **Critical vs Non-Critical Functions**

### **🔴 Critical (Payment Flow Stops if Failed)**
- **`sendRetailerPaymentSMS`** - Required for retailer confirmation
- **`sendWholesalerPaymentSMS`** - Required for wholesaler confirmation

### **🟡 Important (Has Fallbacks)**
- **`sendFCMNotification`** - Push notification (falls back to dashboard display)
- **`sendPaymentCompletionNotification`** - Completion notifications (multiple channels)

### **🟢 Supporting/Testing**
- **`sendFCMOTPNotification`** - Enhanced version of FCM notification
- **`sendOTPNotification`** - Legacy OTP notification
- **`sendTestFCMNotification`** - Manual testing tool
- **`processSMSResponse`** - Webhook processing

---

## 📱 **Notification Channels per Function**

| Function | Push Notification | SMS | Email | Dashboard Display |
|----------|-------------------|-----|-------|-------------------|
| **`sendFCMNotification`** | ✅ Primary | ❌ | ❌ | ✅ Fallback |
| **`sendRetailerPaymentSMS`** | ❌ | ✅ Primary | ❌ | ❌ |
| **`sendWholesalerPaymentSMS`** | ❌ | ✅ Primary | ❌ | ❌ |
| **`sendPaymentCompletionNotification`** | ✅ | ✅ | ✅ | ✅ |
| **`sendFCMOTPNotification`** | ✅ Enhanced | ❌ | ❌ | ✅ |
| **`sendOTPNotification`** | ✅ Legacy | ❌ | ❌ | ✅ |

---

## 🔧 **Technical Implementation Details**

### **FCM Message Structure**
```javascript
// ✅ Correct FCM Message Format
const message = {
  notification: {
    title: notification.title,
    body: notification.body
  },
  data: {
    ...notification.data,
    icon: notification.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: notification.tag,
    clickAction: notification.clickAction
  },
  token: fcmToken,
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      clickAction: notification.clickAction
    }
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1
      }
    }
  }
};
```

### **Environment Variables Required**
```bash
# Functions Environment Variables
FAST2SMS_API_KEY=your-fast2sms-api-key
FAST2SMS_SENDER_ID=SNSYST
FAST2SMS_ENTITY_ID=your-fast2sms-entity-id
APP_FIREBASE_PROJECT_ID=plkapp-8c052

# Frontend Environment Variables
NEXT_PUBLIC_FCM_VAPID_KEY=your-vapid-key-here
```

---

## 🚀 **Deployment Commands**

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:sendFCMNotification

# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only sendFCMNotification
```

---

## 📝 **Recent Changes & Fixes**

### **Fixed Issues:**
1. **FCM Payload Structure** - Moved `icon`, `badge`, `tag`, `clickAction` from `notification` to `data` object
2. **Function Call Method** - Changed from internal HTTP call to direct Firebase function call
3. **Environment Variables** - Fixed reserved prefix issues (`FIREBASE_` → `APP_FIREBASE_`)

### **Current Status:**
- ✅ `sendFCMNotification` - Working (fixed payload structure)
- ✅ `sendRetailerPaymentSMS` - Working
- ✅ `sendWholesalerPaymentSMS` - Working
- 🔄 Other functions - Available for use

This document provides a comprehensive overview of your Firebase Functions architecture and their roles in the PharmaLync payment notification system.