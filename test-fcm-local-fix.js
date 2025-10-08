// Test script to verify FCM token lookup fix
// This simulates what the updated Cloud Function should do

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function testFCMLookup() {
  try {
    console.log('🔧 Testing FCM token lookup for retailer ID: AEGT44cVpaORM6k30r5K');
    
    // This is what the UPDATED Cloud Function should do
    const retailerDoc = await admin.firestore()
      .collection('retailers')
      .doc('AEGT44cVpaORM6k30r5K')
      .get();
    
    if (retailerDoc.exists) {
      const retailerData = retailerDoc.data();
      console.log('✅ Found retailer document');
      
      const fcmDevices = retailerData?.fcmDevices || [];
      console.log(`📱 Found ${fcmDevices.length} FCM devices`);
      
      if (fcmDevices.length > 0) {
        const activeDevice = fcmDevices.reduce((latest, device) => {
          const deviceTime = device.lastActive?.toDate?.() || new Date(0);
          const latestTime = latest?.lastActive?.toDate?.() || new Date(0);
          return deviceTime > latestTime ? device : latest;
        }, fcmDevices[0]);
        
        console.log('✅ Most recent active device:', {
          deviceId: activeDevice.deviceId,
          token: activeDevice.token?.substring(0, 20) + '...',
          lastActive: activeDevice.lastActive?.toDate?.() || 'Unknown',
          userAgent: activeDevice.userAgent?.substring(0, 50) + '...'
        });
        
        console.log('🎯 FCM Token Found:', activeDevice.token);
        return activeDevice.token;
      } else {
        console.log('❌ No FCM devices found');
      }
    } else {
      console.log('❌ Retailer document not found');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error testing FCM lookup:', error);
    return null;
  }
}

// Test the old incorrect way (what's currently deployed)
async function testOldIncorrectWay() {
  try {
    console.log('\n❌ Testing OLD incorrect way (looking in users collection):');
    
    // This is what the OLD Cloud Function is doing (WRONG)
    const userDoc = await admin.firestore()
      .collection('users')
      .doc('retailer_9014882779')
      .get();
    
    if (userDoc.exists) {
      console.log('Found user document in users collection (unexpected)');
    } else {
      console.log('❌ User document not found in users collection (expected - this is the problem!)');
    }
  } catch (error) {
    console.error('Error testing old way:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 FCM Token Lookup Test - Local Verification');
  console.log('=' .repeat(60));
  
  await testOldIncorrectWay();
  await testFCMLookup();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 Summary:');
  console.log('- OLD Cloud Functions look in: users collection with retailer_9014882779');
  console.log('- NEW Cloud Functions should look in: retailers collection with AEGT44cVpaORM6k30r5K');
  console.log('- FCM Token is correctly stored in: retailers/AEGT44cVpaORM6k30r5K/fcmDevices[]');
  console.log('- Solution: Deploy updated Cloud Functions');
}

runTests().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});