import * as admin from 'firebase-admin';

// Fixed getFCMTokenForUser function for retailer users
async function getFCMTokenForUser(userId: string): Promise<string | null> {
  try {
    console.log('🔧 Looking for FCM token for user:', userId);
    
    // First try to get from retailerUsers collection (for retailers)
    const retailerUserDoc = await admin.firestore().collection('retailerUsers').doc(userId).get();
    
    if (retailerUserDoc.exists) {
      const userData = retailerUserDoc.data();
      console.log('📱 Found retailer user, checking FCM devices...');
      
      // Check for fcmDevices array (new structure)
      const fcmDevices = userData?.fcmDevices || [];
      if (fcmDevices.length > 0) {
        // Return the most recently active device token
        const activeDevice = fcmDevices.reduce((latest: any, device: any) => {
          const deviceTime = device.lastActive?.toDate?.() || new Date(0);
          const latestTime = latest?.lastActive?.toDate?.() || new Date(0);
          return deviceTime > latestTime ? device : latest;
        }, fcmDevices[0]);
        
        console.log(`✅ Found ${fcmDevices.length} FCM devices, using most recent:`, activeDevice.token?.substring(0, 20) + '...');
        return activeDevice.token || null;
      }
      
      // Fallback to single fcmToken field (old structure)
      if (userData?.fcmToken) {
        console.log('✅ Found single FCM token (old structure)');
        return userData.fcmToken;
      }
      
      console.log('❌ No FCM devices found for retailer user');
    } else {
      // Try users collection (for other user types)
      console.log('🔍 Checking users collection...');
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Check for fcmDevices array first
        const fcmDevices = userData?.fcmDevices || [];
        if (fcmDevices.length > 0) {
          const activeDevice = fcmDevices.reduce((latest: any, device: any) => {
            const deviceTime = device.lastActive?.toDate?.() || new Date(0);
            const latestTime = latest?.lastActive?.toDate?.() || new Date(0);
            return deviceTime > latestTime ? device : latest;
          }, fcmDevices[0]);
          
          console.log(`✅ Found ${fcmDevices.length} FCM devices in users collection, using most recent:`, activeDevice.token?.substring(0, 20) + '...');
          return activeDevice.token || null;
        }
        
        // Fallback to single fcmToken field
        if (userData?.fcmToken) {
          console.log('✅ Found single FCM token in users collection');
          return userData.fcmToken;
        }
        
        console.log('❌ No FCM devices found for user');
      }
    }
    
    console.log('❌ User document not found');
    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token for user:', userId, error);
    return null;
  }
}

console.log('✅ Updated getFCMTokenForUser function loaded');