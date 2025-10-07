// Simple debug script to check FCM token registration using existing Firebase Admin
const admin = require('firebase-admin');

// Check if Firebase Admin is already initialized
if (!admin.apps.length) {
  // Try to initialize with environment variables
  try {
    admin.initializeApp({
      projectId: 'plkapp-8c052'
    });
    console.log('✅ Firebase Admin initialized with project ID');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function debugFCMTokens() {
  try {
    console.log('🔍 Debugging FCM token registration...\n');

    // 1. Check retailers collection
    console.log('📊 Checking retailers collection...');
    const retailersSnapshot = await db.collection('retailers').limit(3).get();
    console.log(`Found ${retailersSnapshot.size} retailers\n`);

    for (const doc of retailersSnapshot.docs) {
      const retailerData = doc.data();
      console.log(`🏪 Retailer: ${retailerData.name || 'N/A'} (ID: ${doc.id})`);
      
      const fcmDevices = retailerData.fcmDevices || [];
      console.log(`   FCM Devices: ${fcmDevices.length}`);
      
      if (fcmDevices.length > 0) {
        fcmDevices.forEach((device, index) => {
          console.log(`     Device ${index + 1}:`);
          console.log(`       Token: ${device.token ? device.token.substring(0, 30) + '...' : 'N/A'}`);
          console.log(`       Registered: ${device.registeredAt?.toDate?.() || 'N/A'}`);
          console.log(`       Last Active: ${device.lastActive?.toDate?.() || 'N/A'}`);
        });
      } else {
        console.log('   ❌ No FCM devices found');
      }
      
      // Also check for single fcmToken field (old structure)
      if (retailerData.fcmToken) {
        console.log(`   📱 Old FCM Token: ${retailerData.fcmToken.substring(0, 30)}...`);
      }
      
      console.log('');
    }

    // 2. Check recent FCM logs
    console.log('📋 Checking recent FCM logs...');
    const fcmLogsSnapshot = await db.collection('fcmLogs')
      .orderBy('sentAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`Found ${fcmLogsSnapshot.size} recent FCM logs\n`);
    
    for (const doc of fcmLogsSnapshot.docs) {
      const logData = doc.data();
      console.log(`📱 FCM Log: ${logData.type || 'N/A'}`);
      console.log(`   Retailer ID: ${logData.retailerId || 'N/A'}`);
      console.log(`   Status: ${logData.status || 'N/A'}`);
      console.log(`   Sent At: ${logData.sentAt?.toDate?.() || 'N/A'}`);
      console.log(`   Message: ${logData.message || 'N/A'}`);
      console.log('');
    }

    console.log('✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug
debugFCMTokens().then(() => {
  console.log('🎉 Debug script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug script failed:', error);
  process.exit(1);
});