import * as admin from 'firebase-admin';

// Enhanced getFCMTokenForUser function for retailer users (matches working version)
async function getFCMTokenForUser(userId: string, collectionName: string = 'retailerUsers'): Promise<string | null> {
  try {
    console.log('🔧 Looking for FCM token for user:', userId, 'in collection:', collectionName);
    
    // First try the specified collection
    const userDoc = await admin.firestore().collection(collectionName).doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`📱 Found user in ${collectionName}, checking FCM devices...`);
      
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
      
      console.log(`❌ No FCM devices found for user in ${collectionName}`);
    } else {
      console.log(`❌ User document not found in ${collectionName}`);
      
      // If we didn't find in retailers collection, try retailerUsers as fallback for OTP notifications
      if (collectionName === 'retailers') {
        console.log('🔍 Trying fallback to retailerUsers collection...');
        return await getFCMTokenForUser(userId, 'retailerUsers');
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