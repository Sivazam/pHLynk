# Complete List of Notification Titles & Content - PharmaLync

## 📱 **FCM Push Notifications (External)**

### **OTP Notifications**
- **Title**: `🔐 OTP Verification Required` / `🔐 Payment OTP Required`
- **Body**: `Your OTP code is: **{BOLD_OTP}** for ₹{amount} by {lineWorkerName}`
- **Body (Alternative)**: `Your OTP code is: **{BOLD_OTP}**`
- **Used in**: FCM Service, Direct OTP API

### **Payment Status Notifications**
- **Title**: `✅ Payment Completed`
- **Body**: `Payment of ₹{amount} received{ from {customerName}}`

- **Title**: `❌ Payment Failed`
- **Body**: `Payment of ₹{amount} failed{ from {customerName}}`

- **Title**: `⏳ Payment Pending`
- **Body**: `Payment of ₹{amount} is pending{ from {customerName}}`

### **Payment Completion Notifications**
- **Title**: `🎉 Payment Successful`
- **Body**: `Congratulations - you successfully paid ₹{amount} to {retailerName} via Line Man {lineWorkerName}`

- **Title**: `💰 Collection Update`
- **Body**: `Line Man {lineWorkerName} collected ₹{amount} from {retailerName} on {date} at {time}`

### **Test Notifications**
- **Title**: `🧪 Test Notification`
- **Body**: `This is a test notification from the API`
- **Body (Alternative)**: `This is a test FCM notification from pHLynk`

---

## 🔔 **In-App Notifications (Internal Dashboard)**

### **Wholesaler Admin Notifications**

#### **Payment Related**
- **Title**: `Payment collected`
- **Message**: `Payment collected from {retailerName}`

- **Title**: `Payment initiated`
- **Message**: `{workerName} initiated payment from {retailerName}`

- **Title**: `Payment failed`
- **Message**: `Payment of ₹{amount} from {retailerName} failed for {workerName}`

#### **Performance Notifications**
- **Title**: `Top performer`
- **Message**: `{workerName} collected {collectionCount} payments totaling ₹{amount} today`

- **Title**: `Overdue invoice`
- **Message**: `Invoice #{invoiceNumber} for {retailerName} is {daysOverdue} days overdue (₹{amount})`

- **Title**: `Inactive worker activity`
- **Message**: `Inactive worker {workerName} has {activityCount} recent payment activities`

### **Line Worker Notifications**

#### **Payment Related**
- **Title**: `Payment collected successfully`
- **Message**: `Successfully collected ₹{amount} from {retailerName}`

- **Title**: `Payment initiated`
- **Message**: `Payment of ₹{amount} initiated for {retailerName}`

- **Title**: `Payment failed`
- **Message**: `Payment of ₹{amount} failed for {retailerName}`

#### **Assignment Notifications**
- **Title**: `New retailer assigned`
- **Message**: `{retailerName} in {areaName} has been assigned to you`

- **Title**: `New area assigned`
- **Message**: `Area {areaName} with {zipCount} zip codes and {retailerCount} retailers assigned to you`

#### **Performance & Summary**
- **Title**: `Daily collection summary`
- **Message**: `Collected ₹{totalCollections} from {paymentCount} payments across {retailerCount} retailers today`

- **Title**: `High-value collection!`
- **Message**: `Excellent! Collected ₹{amount} from {retailerName}`

- **Title**: `Milestone achieved!`
- **Message**: `{custom description based on milestone}`

### **Super Admin Notifications**

#### **System Notifications**
- **Title**: `Tenant Suspended`
- **Message**: `{tenant details}`

- **Title**: `Low Collection Performance`
- **Message**: `{performance details}`

- **Title**: `System Status`
- **Message**: `{system updates}`

#### **Activity Summaries**
- **Title**: `New Retailers Added`
- **Message**: `{retailer count and details}`

- **Title**: `New Line Workers`
- **Message**: `{worker count and details}`

- **Title**: `Payments Processed`
- **Message**: `{payment statistics}`

---

## 🎯 **Account Status Notifications**

### **Tenant Status Screens**
- **Title**: `Account Active`
- **Title**: `Account Pending Approval`
- **Title**: `Account Suspended`
- **Title**: `Account Rejected`
- **Title**: `Account Status Unknown`

---

## 📧 **Browser Push Actions**

### **Notification Actions**
- **Action Title**: `View OTP`
- **Action Title**: `Dismiss`
- **Action Title**: `Open App`

---

## 🔐 **Security & Authentication**

### **OTP Related**
- **Title**: `Verification Code`
- **Body**: `Your OTP is: {otp}`

- **Title**: `OTP Sent`
- **Title**: `OTP Verified`

---

## 📊 **Real-time Notifications**

### **Payment Events**
- **Title**: `Payment Completed`
- **Title**: `Payment Collected`
- **Title**: `Payment Collected Successfully`
- **Title**: `Payment Received`
- **Title**: `Payment Failed`

### **Assignment Events**
- **Title**: `New Assignment`
- **Title**: `New Retailer Assigned`
- **Title**: `Retailer Unassigned`

### **Activity Events**
- **Title**: `Line Worker Activity`
- **Title**: `Line Worker Updated`

---

## 🎨 **Icon Configuration**

### **Current Setup**
- **Badge Icon (Left)**: `/badge-72x72.png` (PharmaLogo.png - transparent)
- **Large Icon (Right)**: `/notification-large-192x192.png` (logo.png - with background)
- **Status Bar Icon**: `/notification-small-24x24.png` (blue background)

### **Brand Colors**
- **Primary Blue**: `#20439f`
- **Notification Accent**: `#20439f`

---

## 📝 **Notification Categories Summary**

| Category | Count | Primary Use |
|----------|-------|-------------|
| **OTP Notifications** | 3 | Authentication |
| **Payment Status** | 3 | Payment updates |
| **Payment Completion** | 2 | Success confirmations |
| **Test Notifications** | 2 | Development/Testing |
| **Wholesaler Admin** | 6 | Business management |
| **Line Worker** | 8 | Field operations |
| **Super Admin** | 6 | System administration |
| **Account Status** | 5 | User management |
| **Browser Actions** | 3 | User interaction |
| **Real-time Events** | 8 | Live updates |

**Total Unique Notification Types**: 46 different notification combinations

---

## 🔧 **API Endpoints for Notifications**

- `/api/fcm/send-otp-direct` - OTP notifications
- `/api/fcm/send-payment-completion` - Payment completion
- `/api/fcm/send-test` - Test notifications
- `/api/fcm/send-notification` - General notifications
- `/api/otp/send` - OTP via SMS
- `/api/otp/verify` - OTP verification

---

## 📱 **Platform Support**

- ✅ **Android** - Full FCM support with icons
- ✅ **iOS** - APNS support with images
- ✅ **Web** - Browser push notifications
- ✅ **In-App** - Dashboard notifications
- ✅ **SMS** - OTP via Fast2SMS

**All notifications are properly configured with the new icon system and bold OTP formatting!** ✅