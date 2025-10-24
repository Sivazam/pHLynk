/**
 * Test script to verify retailer logout and FCM device filtering
 * This script checks if logged-out retailers still receive notifications
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin with environment variables
let serviceAccountConfig;

try {
  // Try to get service account from environment variables
  serviceAccountConfig = {
    type: process.env.APP_SERVICE_ACCOUNT_TYPE || 'service_account',
    project_id: process.env.APP_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.APP_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: process.env.APP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.APP_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.APP_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.APP_SERVICE_ACCOUNT_AUTH_URI,
    token_uri: process.env.APP_SERVICE_ACCOUNT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.APP_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.APP_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: process.env.APP_SERVICE_ACCOUNT_UNIVERSE_DOMAIN
  };
  
  if (!serviceAccountConfig.private_key || !serviceAccountConfig.client_email || !serviceAccountConfig.project_id) {
    throw new Error('Missing required service account environment variables');
  }
} catch (error) {
  console.error('❌ Failed to load service account configuration:', error.message);
  console.log('Please ensure the following environment variables are set:');
  console.log('- APP_SERVICE_ACCOUNT_PROJECT_ID');
  console.log('- APP_SERVICE_ACCOUNT_PRIVATE_KEY');
  console.log('- APP_SERVICE_ACCOUNT_CLIENT_EMAIL');
  process.exit(1);
}

initializeApp({
  credential: require('firebase-admin').credential.cert(serviceAccountConfig)
});

const db = getFirestore();

async function testRetailerLogoutFCM() {
  console.log('🧪 Testing Retailer Logout FCM Filtering...\n');

  try {
    // Test 1: Check if there are any retailers with inactive devices still receiving notifications
    console.log('📋 Test 1: Checking retailer devices...');
    
    const retailersSnapshot = await db.collection('retailers').get();
    let retailersWithInactiveDevices = 0;
    let totalInactiveDevices = 0;
    
    for (const doc of retailersSnapshot.docs) {
      const retailer = doc.data();
      const fcmDevices = retailer.fcmDevices || [];
      
      if (fcmDevices.length > 0) {
        const inactiveDevices = fcmDevices.filter(device => device.isActive === false);
        
        if (inactiveDevices.length > 0) {
          retailersWithInactiveDevices++;
          totalInactiveDevices += inactiveDevices.length;
          
          console.log(`📱 Retailer: ${retailer.name || 'Unknown'}`);
          console.log(`   ID: ${doc.id}`);
          console.log(`   Total devices: ${fcmDevices.length}`);
          console.log(`   Inactive devices: ${inactiveDevices.length}`);
          
          inactiveDevices.forEach((device, index) => {
            console.log(`   Device ${index + 1}:`);
            console.log(`     - Token: ${device.token.substring(0, 20)}...`);
            console.log(`     - isActive: ${device.isActive}`);
            console.log(`     - lastActive: ${device.lastActive?.toDate?.() || device.lastActive}`);
          });
          console.log('');
        }
      }
    }
    
    console.log(`📊 Summary:`);
    console.log(`   Retailers with inactive devices: ${retailersWithInactiveDevices}`);
    console.log(`   Total inactive devices: ${totalInactiveDevices}`);
    
    // Test 2: Check recent OTP notifications to see if they went to inactive devices
    console.log('\n📋 Test 2: Checking recent OTP notifications...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const otpLogsSnapshot = await db.collection('smsLogs')
      .where('sentAt', '>=', oneHourAgo)
      .where('type', '==', 'RETAILER_OTP')
      .get();
    
    console.log(`Found ${otpLogsSnapshot.size} OTP notifications in the last hour`);
    
    if (otpLogsSnapshot.size > 0) {
      for (const doc of otpLogsSnapshot.docs) {
        const log = doc.data();
        console.log(`\n🔔 OTP Notification:`);
        console.log(`   Retailer ID: ${log.retailerId}`);
        console.log(`   Payment ID: ${log.paymentId}`);
        console.log(`   Sent at: ${log.sentAt?.toDate?.() || log.sentAt}`);
        console.log(`   Status: ${log.status}`);
        
        // Check if this retailer has inactive devices
        const retailerDoc = await db.collection('retailers').doc(log.retailerId).get();
        if (retailerDoc.exists) {
          const retailer = retailerDoc.data();
          const fcmDevices = retailer.fcmDevices || [];
          const inactiveDevices = fcmDevices.filter(device => device.isActive === false);
          
          if (inactiveDevices.length > 0) {
            console.log(`   ⚠️  This retailer has ${inactiveDevices.length} inactive devices!`);
            console.log(`   🚨 Potential issue: OTP might have been sent to logged-out device`);
          } else {
            console.log(`   ✅ This retailer has no inactive devices`);
          }
        }
      }
    }
    
    // Test 3: Simulate cloud function filtering logic
    console.log('\n📋 Test 3: Testing cloud function filtering logic...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let devicesThatWouldBeFiltered = 0;
    let devicesThatWouldPass = 0;
    
    for (const doc of retailersSnapshot.docs) {
      const retailer = doc.data();
      const fcmDevices = retailer.fcmDevices || [];
      
      fcmDevices.forEach(device => {
        const lastActive = device.lastActive?.toDate?.() || new Date(device.lastActive);
        const isRecentlyActive = lastActive > thirtyDaysAgo;
        const isCurrentlyActive = device.isActive !== false;
        const wouldPassFilter = isRecentlyActive && isCurrentlyActive;
        
        if (!wouldPassFilter) {
          devicesThatWouldBeFiltered++;
          console.log(`🚫 Device would be filtered out:`);
          console.log(`   Retailer: ${retailer.name || 'Unknown'}`);
          console.log(`   Device ID: ${device.deviceId}`);
          console.log(`   isActive: ${device.isActive}`);
          console.log(`   lastActive: ${lastActive.toISOString()}`);
          console.log(`   Recently Active: ${isRecentlyActive}`);
          console.log(`   Currently Active: ${isCurrentlyActive}`);
        } else {
          devicesThatWouldPass++;
        }
      });
    }
    
    console.log(`\n📊 Filtering Results:`);
    console.log(`   Devices that would pass filter: ${devicesThatWouldPass}`);
    console.log(`   Devices that would be filtered: ${devicesThatWouldBeFiltered}`);
    
    // Test 4: Check for any recent FCM notification logs
    console.log('\n📋 Test 4: Checking FCM notification logs...');
    
    const fcmLogsSnapshot = await db.collection('fcmLogs')
      .where('sentAt', '>=', oneHourAgo)
      .get();
    
    console.log(`Found ${fcmLogsSnapshot.size} FCM notifications in the last hour`);
    
    if (fcmLogsSnapshot.size > 0) {
      for (const doc of fcmLogsSnapshot.docs) {
        const log = doc.data();
        console.log(`\n📱 FCM Notification:`);
        console.log(`   User ID: ${log.userId}`);
        console.log(`   User Type: ${log.userType}`);
        console.log(`   Sent at: ${log.sentAt?.toDate?.() || log.sentAt}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Devices: ${log.deviceCount || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testRetailerLogoutFCM().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});