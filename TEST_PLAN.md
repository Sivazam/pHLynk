# FCM Notification Fixes - Test Plan

## 🎯 Test Objectives
Verify all three critical issues are resolved:
1. ✅ No duplicate notifications
2. ✅ Correct notification icons display
3. ✅ Logged-out users don't receive notifications

---

## 📋 Pre-Test Requirements

### **MANDATORY SETUP**
1. **Clear Browser Cache**
   - Chrome DevTools → Application → Storage → Clear site data
   - Unregister old Service Workers
   - Hard refresh page

2. **Deploy Cloud Functions**
   ```bash
   cd functions && npm run build
   firebase deploy --only functions
   ```

3. **Test Environment**
   - Use Chrome/Edge (best FCM support)
   - Enable notifications in browser settings
   - Test in both normal and incognito modes

---

## 🧪 Test Cases

### **Test Case 1: Duplicate Notification Prevention**

**Scenario:** OTP Request Flow
**Expected Result:** Only ONE notification received

**Steps:**
1. Login as retailer
2. Initiate a payment that requires OTP
3. **Count notifications received**
4. Verify only 1 OTP notification appears
5. Check browser console for "FCM_SERVICE_DISABLED" message

**✅ PASS CRITERIA:**
- Exactly 1 notification received
- Console shows: `🚫 FCMService.sendToDevice DISABLED`
- No duplicate OTP codes

---

### **Test Case 2: Notification Icon Display**

**Scenario:** Any notification received
**Expected Result:** New high-res icons displayed

**Steps:**
1. Trigger any notification (OTP or payment)
2. **Observe notification appearance**
3. Check icon in notification panel
4. Verify badge icon (small icon) is correct

**✅ PASS CRITERIA:**
- Large icon: `/notification-large-192x192.png` (right side)
- Badge icon: `/badge-72x72.png` (left side)
- Icons are sharp and high-resolution
- No old 192x192 fallback icon

---

### **Test Case 3: Security - Logged-out User Protection**

**Scenario:** User logged out but receives notification trigger
**Expected Result:** NO notification shown

**Steps:**
1. Login as retailer and register device
2. **Complete logout** (clear session)
3. From another device/admin, trigger notification for this user
4. **Verify no notification appears**
5. Check browser console for auth check logs

**✅ PASS CRITERIA:**
- Zero notifications received
- Console shows: `🚫 User not authenticated - discarding notification`
- Service Worker version: 2.0.1

---

### **Test Case 4: Payment Completion Notifications**

**Scenario:** Payment successfully completed
**Expected Result:** Success notification received

**Steps:**
1. Complete a full payment flow
2. **Verify payment completion notification**
3. Check notification content and icons
4. Click notification to verify redirect

**✅ PASS CRITERIA:**
- Payment success notification received
- Correct amount and retailer names
- Click redirects to payment history
- New icons displayed correctly

---

### **Test Case 5: Cross-browser Compatibility**

**Scenario:** Test across different browsers
**Expected Result:** Consistent behavior

**Steps:**
1. Test in Chrome/Brave (Chromium)
2. Test in Firefox
3. Test in Safari (if available)
4. **Compare results**

**✅ PASS CRITERIA:**
- All browsers show same behavior
- Icons work across browsers
- Security checks work everywhere

---

## 🔍 Debugging Tools

### **Browser Console Logs to Watch:**
```javascript
// Service Worker Version
console.log('📱 FCM Service Worker installing...'); // Should show v2.0.1

// Duplicate Prevention
console.log('🚫 FCMService.sendToDevice DISABLED'); // Should appear

// Security Check
console.log('🔐 SW Auth check result: AUTHENTICATED'); // When logged in
console.log('🚫 User not authenticated - discarding notification'); // When logged out

// Icon Paths
console.log('📱 FCM Background message received:', payload); // Check data.icon/data.badge
```

### **Network Tab:**
- Look for Firebase Cloud Functions calls
- Verify `sendPaymentCompletionNotification` requests
- Check response codes (200 = success)

### **Application Tab:**
- Service Workers: Should show version 2.0.1
- IndexedDB: Check Firebase Auth storage
- Storage: Verify notification permissions

---

## 📊 Test Results Template

```
## Test Results - [Date]

### Test Case 1: Duplicate Prevention
- Status: ✅ PASS / ❌ FAIL
- Notifications Received: [Number]
- Console Logs: [Relevant logs]

### Test Case 2: Icon Display
- Status: ✅ PASS / ❌ FAIL
- Large Icon: ✅ Correct / ❌ Old icon
- Badge Icon: ✅ Correct / ❌ Missing
- Service Worker Version: [Version]

### Test Case 3: Security Check
- Status: ✅ PASS / ❌ FAIL
- Logged-out Notifications: [Number]
- Auth Check Logs: [Relevant logs]

### Test Case 4: Payment Completion
- Status: ✅ PASS / ❌ FAIL
- Notification Received: ✅ Yes / ❌ No
- Redirect Working: ✅ Yes / ❌ No

### Test Case 5: Cross-browser
- Chrome: ✅ PASS / ❌ FAIL
- Firefox: ✅ PASS / ❌ FAIL
- Safari: ✅ PASS / ❌ FAIL

## Overall Status: ✅ ALL ISSUES RESOLVED / ❌ ISSUES REMAIN
```

---

## 🚨 Troubleshooting

### **If Still Receiving Duplicates:**
1. Verify browser cache is cleared
2. Check Service Worker version is 2.0.1
3. Look for "FCM_SERVICE_DISABLED" in console
4. Ensure Cloud Functions are deployed

### **If Icons Still Old:**
1. Hard refresh with Ctrl+Shift+R
2. Clear Service Worker cache
3. Verify new icon files exist in `/public/`
4. Check network tab for 404 errors

### **If Security Issues Persist:**
1. Verify Firebase Auth is working
2. Check auth state in console
3. Ensure Service Worker has auth permissions
4. Test with different user accounts

---

## 📞 Support

If issues persist after following this test plan:
1. Collect all console logs
2. Document exact steps taken
3. Note browser version and OS
4. Check Cloud Functions deployment status

**Expected Outcome:** All three critical issues should be completely resolved with proper deployment and cache clearing.