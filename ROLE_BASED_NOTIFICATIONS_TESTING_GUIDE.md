# Role-Based PWA Notification System - Testing Guide

## 🎯 Overview

The pHLynk PWA notification system has been updated with **role-based targeting** to ensure users only receive relevant notifications based on their roles.

## 📋 Notification Rules

### 🔐 OTP Notifications (RETAILER ONLY)
- **Who receives**: ONLY Retailer users
- **Who doesn't receive**: Wholesaler, Super Admin, Line Worker
- **Content**: OTP code and payment amount
- **Trigger**: When Line Worker generates OTP

### ✅ Payment Completion Notifications (ALL USERS)
- **Who receives**: All user roles (Super Admin, Wholesaler, Line Worker, Retailer)
- **Content**: Payment completion confirmation
- **Trigger**: When OTP is successfully verified and payment completed

### 📱 Test Notifications (ALL USERS)
- **Who receives**: All user roles
- **Content**: Test notification message
- **Trigger**: Manual test from PWA Notification Manager

## 🧪 Testing Scenarios

### Scenario 1: OTP Notification (Retailer Only)

**Steps:**
1. Login as **Line Worker**
2. Navigate to Line Worker dashboard
3. Initiate a payment and generate OTP
4. **Expected Result**: 
   - ✅ Retailer receives OTP notification with code and amount
   - ❌ Line Worker does NOT receive OTP notification
   - ❌ Wholesaler does NOT receive OTP notification
   - ❌ Super Admin does NOT receive OTP notification

**Verification:**
- Login as Retailer → Should see OTP notification
- Login as other roles → Should NOT see OTP notification

### Scenario 2: Payment Completion (All Users)

**Steps:**
1. Complete OTP verification process
2. **Expected Result**: 
   - ✅ All users (Super Admin, Wholesaler, Line Worker, Retailer) receive payment completion notification

**Verification:**
- Login as each role → All should see payment completion notification

### Scenario 3: Test Notifications (All Users)

**Steps:**
1. Login as any user role
2. Go to Dashboard → Overview tab
3. Find "PWA Notifications" card
4. Click "Send Test Notification"
5. **Expected Result**: 
   - ✅ Current user receives test notification

### Scenario 4: PWA Installation & Background

**Steps:**
1. Open app in Chrome/Edge browser
2. Look for install prompt (should appear automatically)
3. Install app as PWA
4. Open app from home screen
5. **Expected Result**: 
   - ✅ Install prompt appears
   - ✅ App installs successfully
   - ✅ Background notifications work when app is closed
   - ✅ Notification permission requested on first launch

## 🔍 Technical Verification

### Check Role-Based Filtering

1. Open browser DevTools
2. Go to Application tab → Local Storage
3. Check `user` object for current role
4. Trigger OTP generation
5. Check Console logs for:
   ```
   📱 PWA OTP notification sent to retailer only
   🔕 Notification filtered out - User role: {role}, Target: retailer
   ```

### Service Worker Verification

1. Go to DevTools → Application → Service Workers
2. Check service worker is active
3. Go to Console and type:
   ```javascript
   navigator.serviceWorker.controller.postMessage({
     type: 'SHOW_NOTIFICATION',
     payload: {
       title: 'Test',
       body: 'Role-based test'
     }
   });
   ```

### Background Notification Test

1. Install app as PWA
2. Close the app completely
3. Have another user generate OTP
4. **Expected**: Notification should appear even when app is closed

## 🚨 Common Issues & Solutions

### Issue: OTP notifications going to all users
**Solution**: Check that `roleBasedNotificationService.sendOTPToRetailer()` is being used instead of the old service

### Issue: No notifications appearing
**Solution**: 
1. Check browser notification permissions
2. Verify service worker is registered
3. Check console for errors

### Issue: PWA not installing
**Solution**:
1. Use Chrome/Edge browser
2. Check manifest.json is accessible
3. Ensure service worker is properly registered

### Issue: Background notifications not working
**Solution**:
1. Ensure app is installed as PWA
2. Check notification permissions are granted
3. Verify service worker is active in background

## 📱 Browser Compatibility

| Browser | PWA Support | Notifications | Background |
|---------|-------------|---------------|-------------|
| Chrome | ✅ Full | ✅ Full | ✅ Full |
| Edge | ✅ Full | ✅ Full | ✅ Full |
| Firefox | ⚠️ Limited | ⚠️ Limited | ❌ No |
| Safari | ⚠️ Limited | ⚠️ Limited | ❌ No |

## 🎯 Success Criteria

- ✅ OTP notifications only go to Retailers
- ✅ Payment completion notifications go to all users
- ✅ PWA installs successfully on supported browsers
- ✅ Background notifications work when app is closed
- ✅ Role-based filtering works correctly
- ✅ No irrelevant notifications are sent to any user role

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify user role in localStorage
3. Ensure service worker is active
4. Test with different user roles
5. Check notification permissions in browser settings