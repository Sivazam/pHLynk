# PWA Notifications Testing Guide

## 🎯 Overview

This guide provides comprehensive steps to test and verify PWA (Progressive Web App) notifications for OTP and payment success events across all dashboards in the pHLynk application.

## 📋 Features Implemented

### ✅ PWA Notifications for:
- **OTP Generation** - When line workers generate OTP for payment collection
- **Payment Success** - When payments are successfully verified and completed
- **Cross-Dashboard Support** - Works for all user roles (Super Admin, Wholesaler, Line Worker, Retailer)

### ✅ Dashboard Integration:
- **Super Admin Dashboard** - Overview tab includes PWA notification manager
- **Wholesaler Admin Dashboard** - Overview tab includes PWA notification manager  
- **Line Worker Dashboard** - Overview tab includes PWA notification manager
- **Retailer Dashboard** - Overview tab includes PWA notification manager

## 🔧 Testing Prerequisites

### Browser Requirements:
- **Chrome/Edge** - Full PWA notification support
- **Firefox** - Basic notification support
- **Safari** - Limited support (use Chrome for best results)
- **Mobile Chrome** - Full PWA support

### Environment Setup:
1. **HTTPS or localhost** - Notifications require secure context
2. **Browser permissions** - Must allow notifications
3. **Service Worker** - Must be registered and active

## 🧪 Step-by-Step Testing Guide

### Phase 1: Basic PWA Setup Verification

#### 1.1 Check Service Worker Status
1. Open the application in Chrome
2. Open Developer Tools (F12)
3. Go to **Application** tab
4. Select **Service Workers** from left menu
5. Verify:
   - Service worker is **activated and running**
   - Status shows "activated: true"
   - No errors in console

#### 1.2 Check Notification Permissions
1. Click the **lock icon** (🔒) in the address bar
2. Verify **Notifications** permission is set to "Allow"
3. If not allowed, click "Allow" and refresh the page

#### 1.3 Verify PWA Notification Manager
1. Log in to any dashboard (Super Admin, Wholesaler, Line Worker, or Retailer)
2. Navigate to **Overview** tab
3. Look for **"PWA Notifications"** card
4. Verify:
   - Shows "Permission Granted" status ✅
   - Shows "Active" badge if subscribed
   - Has settings toggle button

### Phase 2: OTP Notification Testing

#### 2.1 Enable Notifications (if not already)
1. In the PWA Notifications card, click **"Enable Notifications"**
2. Browser will request permission - click **"Allow"**
3. Status should change to "Permission Granted"
4. Click **"Subscribe to Notifications"**
5. Should show "Active" badge

#### 2.2 Test OTP Notification
**Scenario: Line Worker generates OTP for payment collection**

1. **Login as Line Worker**:
   - Use line worker credentials
   - Navigate to **Retailers** tab
   - Select any retailer
   - Click **"Collect Payment"**
   - Enter payment amount
   - Click **"Generate OTP"**

2. **Verify OTP Notification**:
   - Check browser notification area (top-right corner)
   - Should see notification with:
     - Title: "🔐 New OTP Generated"
     - Body: "OTP: [XXXXX] for ₹[amount] by [Line Worker Name]"
     - Icon: PharmaLync icon
     - Actions: "View OTP" and "Dismiss" buttons

3. **Test Notification Click**:
   - Click on the notification
   - Should focus the browser window/tab
   - Should navigate to relevant section

#### 2.3 Cross-Dashboard OTP Testing
Test OTP notifications from different dashboard perspectives:

1. **Super Admin** - Should see OTP notifications for all tenants
2. **Wholesaler Admin** - Should see OTP notifications for their tenant
3. **Line Worker** - Should see OTP notifications they generate
4. **Retailer** - Should see OTP notifications addressed to them

### Phase 3: Payment Success Notification Testing

#### 3.1 Test Payment Success Notification
**Scenario: Payment is successfully verified and completed**

1. **Complete Payment Flow**:
   - Continue from OTP generation (Phase 2)
   - **Retailer**: Enter the OTP received
   - Click **"Verify OTP"**
   - Payment should be marked as completed

2. **Verify Payment Success Notification**:
   - Check browser notification area
   - Should see notification with:
     - Title: "✅ Payment Completed"
     - Body: "Payment of ₹[amount] completed successfully"
     - Icon: PharmaLync icon
     - Payment ID tag for grouping

#### 3.2 Cross-Dashboard Payment Testing
Test payment notifications from different roles:

1. **Line Worker** - Gets notification when they complete a payment
2. **Retailer** - Gets notification when their payment is completed
3. **Wholesaler Admin** - Gets notification for payments in their tenant
4. **Super Admin** - Gets notification for all completed payments

### Phase 4: Advanced Testing

#### 4.1 Background Notification Testing
1. **Minimize the browser window** or switch to another tab
2. **Generate OTP** or **complete payment**
3. **Verify notification appears** even when app is not in focus
4. **Click notification** to bring app back to focus

#### 4.2 PWA Mode Testing
1. **Install PWA**:
   - In Chrome, look for **install icon** (⬇) in address bar
   - Click "Install PharmaLync"
   - App should open in standalone window

2. **Test notifications in PWA mode**:
   - Generate OTP and complete payments
   - Verify notifications work in PWA mode
   - Test background notifications (minimize PWA window)

#### 4.3 Test Notification Settings
1. **Open PWA Notification Manager settings**
2. **Test "Send Test Notification" button**
3. **Verify test notification appears**
4. **Test unsubscribe/subscribe functionality**
5. **Verify settings persist across page refresh**

## 🔍 Troubleshooting Guide

### Common Issues and Solutions:

#### ❌ Notifications Not Appearing
**Possible Causes:**
1. **Browser permission denied**
   - Solution: Click lock icon → Allow notifications → Refresh page

2. **Service Worker not registered**
   - Solution: Clear browser cache → Refresh page → Check service worker status

3. **HTTPS requirement**
   - Solution: Use localhost or HTTPS deployment

4. **Browser compatibility**
   - Solution: Use Chrome/Edge for full functionality

#### ❌ "Permission Required" Status
**Solution:**
1. Click "Enable Notifications" button
2. Allow browser permission when prompted
3. Click "Subscribe to Notifications"

#### ❌ Service Worker Errors
**Check Console:**
1. Open Developer Tools → Console
2. Look for service worker errors
3. Clear cache and reload if needed

#### ❌ Notifications Not Working in Background
**Solutions:**
1. Ensure browser is not in battery saver mode
2. Check system notification settings
3. Verify browser is not blocking notifications

## 📊 Testing Checklist

### ✅ Basic Setup:
- [ ] Service worker is active
- [ ] Notification permission granted
- [ ] PWA Notification Manager visible in all dashboards
- [ ] Subscription status shows "Active"

### ✅ OTP Notifications:
- [ ] OTP generation triggers notification
- [ ] Notification shows correct OTP and amount
- [ ] Notification appears in all relevant dashboards
- [ ] Clicking notification focuses app

### ✅ Payment Success Notifications:
- [ ] Payment completion triggers notification
- [ ] Notification shows correct amount and details
- [ ] Notification appears in all relevant dashboards
- [ ] Background notifications work

### ✅ Advanced Features:
- [ ] Test notifications work
- [ ] Subscribe/Unsubscribe functionality works
- [ ] Settings persist across refresh
- [ ] PWA mode notifications work
- [ ] Cross-dashboard notifications work correctly

## 🚀 Production Deployment Notes

### For Production Environment:
1. **HTTPS is mandatory** for notifications
2. **VAPID keys** should be configured for push notifications
3. **Domain permissions** must be properly set
4. **Service Worker** should be properly versioned

### Monitoring:
1. Check browser console for notification errors
2. Monitor service worker registration status
3. Track notification delivery success rates
4. Test across different browsers and devices

## 📱 Mobile Testing

### Additional Mobile Tests:
1. Install PWA on mobile device
2. Test notifications with app in background
3. Test notifications with device locked
4. Verify notification sound and vibration
5. Test notification banner on mobile

---

## 🎯 Success Criteria

**PWA Notifications are working correctly when:**

✅ All dashboards show the PWA Notification Manager
✅ Users can grant permission and subscribe successfully  
✅ OTP generation triggers immediate notifications
✅ Payment completion triggers success notifications
✅ Notifications work when app is in background
✅ Notifications work in PWA standalone mode
✅ Cross-dashboard notifications work for all user roles
✅ Test notifications can be sent successfully
✅ Settings persist across browser sessions

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Compatible with:** pHLynk v3.1.0+