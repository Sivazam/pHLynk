// Debug script to check FCM token registration for retailers
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./pharmalynk-firebase-adminsdk.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pharmalynk-9c335'
  });
}

const db = admin.firestore();

async function debugRetailerFCM() {
  try {
    console.log('🔍 Debugging FCM token registration for retailers...\n');

    // 1. Check all retailers
    const retailersSnapshot = await db.collection('retailers').limit(5).get();
    console.log(`📊 Found ${retailersSnapshot.size} retailers to check\n`);

    for (const doc of retailersSnapshot.docs) {
      const retailerData = doc.data();
      console.log(`🏪 Retailer: ${retailerData.name || 'N/A'} (ID: ${doc.id})`);
      console.log(`   Phone: ${retailerData.phone || 'N/A'}`);
      
      const fcmDevices = retailerData.fcmDevices || [];
      console.log(`   FCM Devices: ${fcmDevices.length}`);
      
      if (fcmDevices.length > 0) {
        fcmDevices.forEach((device, index) => {
          console.log(`     Device ${index + 1}:`);
          console.log(`       Token: ${device.token ? device.token.substring(0, 30) + '...' : 'N/A'}`);
          console.log(`       Registered: ${device.registeredAt?.toDate?.() || 'N/A'}`);
          console.log(`       Last Active: ${device.lastActive?.toDate?.() || 'N/A'}`);
          console.log(`       User Agent: ${device.userAgent?.substring(0, 50) + '...' || 'N/A'}`);
        });
      } else {
        console.log('   ❌ No FCM devices found');
      }
      
      console.log('');
    }

    // 2. Check retailerUsers collection
    console.log('🔍 Checking retailerUsers collection...\n');
    const retailerUsersSnapshot = await db.collection('retailerUsers').limit(3).get();
    console.log(`📊 Found ${retailerUsersSnapshot.size} retailer users to check\n`);

    for (const doc of retailerUsersSnapshot.docs) {
      const userData = doc.data();
      console.log(`👤 Retailer User: ${userData.name || 'N/A'} (ID: ${doc.id})`);
      console.log(`   Phone: ${userData.phone || 'N/A'}`);
      console.log(`   Retailer ID: ${userData.retailerId || 'N/A'}`);
      console.log(`   Is Active: ${userData.isActive || 'N/A'}`);
      console.log(`   Tenant ID: ${userData.tenantId || 'N/A'}`);
      
      // Check if corresponding retailer document exists
      if (userData.retailerId) {
        const retailerDoc = await db.collection('retailers').doc(userData.retailerId).get();
        if (retailerDoc.exists) {
          const retailerData = retailerDoc.data();
          const fcmDevices = retailerData.fcmDevices || [];
          console.log(`   ✅ Retailer document exists with ${fcmDevices.length} FCM devices`);
        } else {
          console.log(`   ❌ Retailer document NOT found for ID: ${userData.retailerId}`);
        }
      }
      
      console.log('');
    }

    // 3. Check for any FCM tokens in other collections
    console.log('🔍 Checking for FCM tokens in other collections...\n');
    
    const collections = ['users', 'tenants'];
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).limit(2).get();
      console.log(`📁 ${collectionName} collection: ${snapshot.size} documents`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const fcmDevices = data.fcmDevices || [];
        if (fcmDevices.length > 0) {
          console.log(`   📱 Document ${doc.id} has ${fcmDevices.length} FCM devices`);
        }
      }
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug
debugRetailerFCM().then(() => {
  console.log('🎉 Debug script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug script failed:', error);
  process.exit(1);
});