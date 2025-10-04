// Find existing retailer IDs for testing
const admin = require('firebase-admin');

// Try to use environment variables or default config
try {
  if (!admin.apps.length) {
    // Check if we have credentials in environment
    const projectId = process.env.FIREBASE_PROJECT_ID || 'pharmalynk-9c335';
    
    // For development, we might not have admin access
    // Let's try to connect with default config
    if (process.env.FIREBASE_ADMIN_SDK) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    } else {
      console.log('🔍 Firebase Admin SDK not configured, using client-side approach...');
      console.log('📱 You need to manually check the browser console for retailer IDs');
      console.log('📝 Or check the Firestore console for existing retailers');
      process.exit(0);
    }
  }

  const db = admin.firestore();

  async function findRetailerIds() {
    try {
      console.log('🔍 Searching for existing retailers...');
      
      const retailersSnapshot = await db.collection('retailers').limit(5).get();
      
      if (retailersSnapshot.empty) {
        console.log('❌ No retailers found in the database');
        return;
      }
      
      console.log(`✅ Found ${retailersSnapshot.size} retailers:`);
      console.log('');
      
      retailersSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🏪 Retailer ID: ${doc.id}`);
        console.log(`   Name: ${data.name || 'N/A'}`);
        console.log(`   Phone: ${data.phone || 'N/A'}`);
        console.log(`   FCM Devices: ${data.fcmDevices?.length || 0}`);
        console.log('');
      });
      
      console.log('🧪 You can use these retailer IDs to test FCM registration');
      
    } catch (error) {
      console.error('❌ Error finding retailers:', error.message);
    }
  }

  findRetailerIds().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.log('💡 You can still test FCM by:');
  console.log('   1. Logging in as a retailer in the browser');
  console.log('   2. Checking the browser console for the retailer ID');
  console.log('   3. Using that ID in the FCM test page');
  process.exit(1);
}