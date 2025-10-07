# Offline Support Requirements for Line Workers

## 🎯 **Overview**

This document outlines the requirements and implementation strategy for adding offline support to the pHLynk system, specifically for line workers who operate in areas with poor or intermittent internet connectivity.

## 📋 **Business Problem**

Line workers in the pharmaceutical supply chain often work in areas with:
- Unreliable mobile internet connectivity
- Intermittent network access
- Poor signal strength in rural/remote areas
- Network congestion during peak hours

This creates significant challenges for:
- Real-time payment collection
- OTP verification processes
- Data synchronization
- Access to retailer information

## 🎯 **Offline Use Cases**

### **Primary Use Cases**

#### **1. Payment Collection Initiation**
- **Scenario**: Line worker visits retailer with no internet
- **Requirements**:
  - View retailer outstanding amounts (cached)
  - Initiate payment collection offline
  - Generate OTP locally
  - Store payment data locally
  - Sync when connection restored

#### **2. OTP Verification**
- **Scenario**: Retailer provides OTP but no internet for verification
- **Requirements**:
  - Verify OTP locally (time-limited)
  - Store verification result locally
  - Show payment confirmation to retailer
  - Sync verification when online

#### **3. Retailer Information Access**
- **Scenario**: Need to access retailer details offline
- **Requirements**:
  - Cache retailer contact information
  - Store outstanding amounts (last known)
  - Access payment history (recent transactions)
  - View retailer location and area info

#### **4. Area Management**
- **Scenario**: Navigate assigned areas without internet
- **Requirements**:
  - Cache area boundaries and zipcodes
  - Store assigned retailer locations
  - Access route information offline
  - Track visited locations

### **Secondary Use Cases**

#### **5. Invoice Reference**
- **Scenario**: Show recent invoices to retailer during collection
- **Requirements**:
  - Cache recent invoice data
  - Display invoice details offline
  - Show payment status

#### **6. Payment History**
- **Scenario**: Retailer asks about previous payments
- **Requirements**:
  - Store payment history locally
  - Show payment details offline
  - Display payment confirmation status

## 🔧 **Technical Implementation Strategy**

### **Architecture Overview**

```
Online Mode ←→ Service Worker ←→ IndexedDB ←→ Application Cache
     ↑                ↑                ↑                ↑
Real-time Sync    Background Sync   Local Storage    Offline Data
```

### **Core Components**

#### **1. Service Worker**
- **Purpose**: Handle background sync and cache management
- **Responsibilities**:
  - Intercept network requests
  - Cache API responses
  - Manage background synchronization
  - Handle offline/online transitions

#### **2. IndexedDB**
- **Purpose**: Local database for offline data storage
- **Data Schema**:
  ```javascript
  // Retailers Store
  {
    id: 'retailer_123',
    name: 'Medical Store ABC',
    phone: '+919876543210',
    address: '123 Main St',
    currentOutstanding: 5000,
    lastSync: '2024-01-20T10:30:00Z',
    areaId: 'area_456'
  }

  // Payments Store
  {
    id: 'payment_789',
    retailerId: 'retailer_123',
    amount: 1000,
    method: 'CASH',
    status: 'PENDING_SYNC',
    createdAt: '2024-01-20T10:30:00Z',
    otp: '123456',
    synced: false
  }

  // OTP Store
  {
    paymentId: 'payment_789',
    code: '123456',
    expiresAt: '2024-01-20T10:40:00Z',
    verified: false,
    verifiedAt: null
  }

  // Sync Queue
  {
    id: 'sync_123',
    type: 'PAYMENT',
    data: {...paymentData},
    status: 'PENDING',
    retryCount: 0,
    lastAttempt: '2024-01-20T10:30:00Z'
  }
  ```

#### **3. Application Cache**
- **Purpose**: Cache static assets and frequently accessed data
- **Cache Strategy**:
  - Static assets: Cache-first strategy
  - API data: Network-first with fallback to cache
  - Critical data: Stale-while-revalidate

### **Data Synchronization Strategy**

#### **1. Initial Data Load**
```javascript
// On app initialization or login
async function initializeOfflineData() {
  // Cache assigned retailers
  const retailers = await getAssignedRetailers();
  await cacheRetailers(retailers);
  
  // Cache recent payments
  const recentPayments = await getRecentPayments();
  await cachePayments(recentPayments);
  
  // Cache area information
  const areas = await getAssignedAreas();
  await cacheAreas(areas);
}
```

#### **2. Background Sync**
```javascript
// Service worker background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'payment-sync') {
    event.waitUntil(syncPendingPayments());
  }
  
  if (event.tag === 'retailer-sync') {
    event.waitUntil(syncRetailerData());
  }
});

async function syncPendingPayments() {
  const pendingPayments = await getPendingPaymentsFromIndexedDB();
  
  for (const payment of pendingPayments) {
    try {
      await syncPaymentToServer(payment);
      await markPaymentAsSynced(payment.id);
    } catch (error) {
      await incrementRetryCount(payment.id);
    }
  }
}
```

#### **3. Conflict Resolution**
```javascript
// Handle conflicts when syncing
async function resolveConflicts(localData, serverData) {
  // Payment conflicts
  if (localData.type === 'PAYMENT') {
    // If server has newer data, server wins
    if (new Date(serverData.updatedAt) > new Date(localData.updatedAt)) {
      return serverData;
    }
    // If local has newer data, local wins
    return localData;
  }
  
  // Retailer outstanding amount conflicts
  if (localData.type === 'RETAILER_OUTSTANDING') {
    // Use the higher amount for safety
    return Math.max(localData.amount, serverData.amount);
  }
}
```

### **Offline OTP Management**

#### **1. Local OTP Generation**
```javascript
class OfflineOTPManager {
  generatePaymentOTP(paymentId) {
    // Generate time-based OTP with device fingerprint
    const timestamp = Date.now();
    const deviceFingerprint = this.getDeviceFingerprint();
    const seed = `${paymentId}_${timestamp}_${deviceFingerprint}`;
    
    // Generate 6-digit OTP
    const otp = this.generateSecureOTP(seed);
    const expiresAt = timestamp + (10 * 60 * 1000); // 10 minutes
    
    // Store locally
    this.storeOTP(paymentId, {
      code: otp,
      expiresAt,
      generatedAt: timestamp,
      verified: false
    });
    
    return otp;
  }
  
  verifyOTP(paymentId, userOTP) {
    const storedOTP = this.getStoredOTP(paymentId);
    
    if (!storedOTP) {
      return { valid: false, error: 'OTP not found' };
    }
    
    if (Date.now() > storedOTP.expiresAt) {
      return { valid: false, error: 'OTP expired' };
    }
    
    if (storedOTP.verified) {
      return { valid: false, error: 'OTP already used' };
    }
    
    if (storedOTP.code === userOTP) {
      this.markOTPAsVerified(paymentId);
      return { valid: true };
    }
    
    return { valid: false, error: 'Invalid OTP' };
  }
}
```

#### **2. OTP Synchronization**
```javascript
// When coming back online
async function syncOfflineOTPs() {
  const offlineOTPs = await getOfflineOTPs();
  
  for (const otp of offlineOTPs) {
    if (otp.verified) {
      // Sync verified OTP to server
      await syncVerifiedOTP(otp);
    } else {
      // Check if OTP expired during offline period
      if (Date.now() > otp.expiresAt) {
        await markOTPAsExpired(otp.paymentId);
      }
    }
  }
}
```

## 📱 **User Experience Considerations**

### **1. Connectivity Status**
```javascript
// Show connectivity status to user
function useConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('synced');
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      startBackgroundSync();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline, syncStatus };
}
```

### **2. Offline Mode UI**
```javascript
function OfflineBanner() {
  const { isOnline, syncStatus } = useConnectivityStatus();
  
  if (isOnline) {
    return null;
  }
  
  return (
    <div className="offline-banner">
      <div className="offline-icon">📡</div>
      <div className="offline-message">
        <strong>You're offline</strong>
        <p>Payment collection will sync when you're back online</p>
      </div>
      <div className="sync-status">
        {syncStatus === 'syncing' && 'Syncing...'}
        {syncStatus === 'pending' && `${getPendingCount()} items pending sync`}
      </div>
    </div>
  );
}
```

### **3. Data Freshness Indicators**
```javascript
function DataFreshnessIndicator({ lastSync }) {
  const getTimeAgo = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  return (
    <div className="freshness-indicator">
      <span className="last-sync">
        Last sync: {getTimeAgo(lastSync)}
      </span>
      <button 
        className="refresh-btn"
        onClick={refreshData}
        disabled={!navigator.onLine}
      >
        Refresh
      </button>
    </div>
  );
}
```

## 🔒 **Security Considerations**

### **1. Data Encryption**
```javascript
// Encrypt sensitive data stored locally
async function encryptData(data, password) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  
  // Generate key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('PharmaLync-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  return {
    encrypted: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv)
  };
}
```

### **2. Device Authentication**
```javascript
// Device fingerprinting for security
function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ];
  
  return btoa(components.join('|'));
}
```

### **3. Data Expiry**
```javascript
// Automatically expire old data
function cleanupOldData() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  
  // Clean up old payments
  const oldPayments = payments.filter(p => 
    now - p.createdAt > maxAge
  );
  
  // Clean up expired OTPs
  const expiredOTPs = otps.filter(otp => 
    now > otp.expiresAt
  );
  
  // Remove old data
  removeData(oldPayments, expiredOTPs);
}
```

## 🚀 **Implementation Plan**

### **Phase 1: Foundation (2-3 weeks)**
1. **Service Worker Setup**
   - Register service worker
   - Implement basic caching
   - Set up background sync

2. **IndexedDB Schema**
   - Design database schema
   - Implement CRUD operations
   - Add data migration support

3. **Basic Offline Support**
   - Cache retailer data
   - Store payments locally
   - Implement basic sync

### **Phase 2: Core Features (3-4 weeks)**
1. **Offline OTP System**
   - Local OTP generation
   - Offline verification
   - OTP synchronization

2. **Enhanced Sync**
   - Conflict resolution
   - Retry mechanisms
   - Progress tracking

3. **User Experience**
   - Connectivity indicators
   - Sync status display
   - Offline mode UI

### **Phase 3: Advanced Features (2-3 weeks)**
1. **Security Enhancements**
   - Data encryption
   - Device authentication
   - Data expiry policies

2. **Performance Optimization**
   - Data compression
   - Selective syncing
   - Battery optimization

3. **Testing & Documentation**
   - Offline testing scenarios
   - Performance testing
   - User documentation

## 📊 **Success Metrics**

### **Technical Metrics**
- **Sync Success Rate**: >95% of offline operations sync successfully
- **Data Freshness**: Cached data less than 1 hour old
- **Performance**: Offline operations complete in <2 seconds
- **Storage**: Local database <50MB per device

### **Business Metrics**
- **Offline Coverage**: Support for 100% offline scenarios
- **User Adoption**: Line workers can work without internet
- **Data Accuracy**: No data loss during offline operations
- **Productivity**: 30% increase in field worker efficiency

## 🎯 **Conclusion**

Offline support is critical for the success of pHLynk in the pharmaceutical supply chain, particularly for line workers operating in areas with poor connectivity. The implementation strategy outlined above provides a comprehensive approach to:

1. **Enable offline payment collection**
2. **Maintain data consistency**
3. **Provide seamless user experience**
4. **Ensure security and reliability**

The phased implementation approach allows for gradual rollout and testing, ensuring that each component works correctly before moving to the next phase. With proper offline support, pHLynk will be able to operate effectively in any connectivity scenario, making it a truly field-ready solution for pharmaceutical payment collection.