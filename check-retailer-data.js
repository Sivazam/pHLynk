/**
 * Check retailer data structure in Firebase
 * This will help us understand the actual data being sent to cloud functions
 */

// Import Firebase Admin SDK directly
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'pharmalynkk'
  });
}

const db = admin.firestore();

async function checkRetailerData() {
  console.log('🔍 Checking Retailer Data Structure...\n');
  
  try {
    // 1. Check recent payments
    console.log('📋 Checking recent completed payments...');
    const paymentsSnapshot = await db.collection('payments')
      .where('state', '==', 'COMPLETED')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();
    
    if (paymentsSnapshot.empty) {
      console.log('❌ No recent completed payments found');
      
      // Try to find any payments
      const allPaymentsSnapshot = await db.collection('payments').limit(3).get();
      if (allPaymentsSnapshot.empty) {
        console.log('❌ No payments found at all');
        return;
      } else {
        console.log(`📋 Found ${allPaymentsSnapshot.docs.length} payments (any state):\n`);
        
        for (const paymentDoc of allPaymentsSnapshot.docs) {
          const payment = paymentDoc.data();
          console.log(`📄 Payment ID: ${paymentDoc.id}`);
          console.log(`  Retailer ID: ${payment.retailerId}`);
          console.log(`  Line Worker ID: ${payment.lineWorkerId}`);
          console.log(`  Amount: ${payment.totalPaid}`);
          console.log(`  State: ${payment.state}`);
          console.log(`  Created: ${payment.createdAt?.toDate?.() || 'N/A'}`);
        }
      }
      return;
    }
    
    console.log(`✅ Found ${paymentsSnapshot.docs.length} recent completed payments:\n`);
    
    for (const paymentDoc of paymentsSnapshot.docs) {
      const payment = paymentDoc.data();
      console.log(`📄 Payment ID: ${paymentDoc.id}`);
      console.log(`  Retailer ID: ${payment.retailerId}`);
      console.log(`  Line Worker ID: ${payment.lineWorkerId}`);
      console.log(`  Amount: ${payment.totalPaid}`);
      console.log(`  State: ${payment.state}`);
      console.log(`  Created: ${payment.createdAt?.toDate?.() || 'N/A'}`);
      
      // 2. Check if retailer exists in retailerUsers collection
      console.log(`\n🔍 Checking retailerUsers collection for retailerId: ${payment.retailerId}`);
      const retailerUsersSnapshot = await db.collection('retailerUsers')
        .where('retailerId', '==', payment.retailerId)
        .limit(1)
        .get();
      
      if (retailerUsersSnapshot.empty) {
        console.log(`  ❌ Retailer not found in retailerUsers collection`);
        
        // 3. Check if retailer exists in retailers collection
        console.log(`\n🔍 Checking retailers collection for ID: ${payment.retailerId}`);
        const retailerDoc = await db.collection('retailers').doc(payment.retailerId).get();
        
        if (retailerDoc.exists) {
          const retailerData = retailerDoc.data();
          console.log(`  ✅ Retailer found in retailers collection:`);
          console.log(`    Name: ${retailerData.name}`);
          console.log(`    Phone: ${retailerData.phone}`);
          console.log(`    Address: ${retailerData.address}`);
          console.log(`    Area ID: ${retailerData.areaId}`);
          
          // 4. Check if there's a corresponding retailerUser
          console.log(`\n🔍 Looking for retailerUser with phone: ${retailerData.phone}`);
          const retailerUserByPhoneSnapshot = await db.collection('retailerUsers')
            .where('phone', '==', retailerData.phone)
            .limit(1)
            .get();
          
          if (!retailerUserByPhoneSnapshot.empty) {
            const retailerUser = retailerUserByPhoneSnapshot.docs[0].data();
            console.log(`  ✅ Found retailerUser by phone:`);
            console.log(`    ID: ${retailerUserByPhoneSnapshot.docs[0].id}`);
            console.log(`    Retailer ID: ${retailerUser.retailerId}`);
            console.log(`    Name: ${retailerUser.name}`);
            console.log(`    Phone: ${retailerUser.phone}`);
            console.log(`    Tenant ID: ${retailerUser.tenantId}`);
          } else {
            console.log(`  ❌ No retailerUser found with this phone`);
          }
        } else {
          console.log(`  ❌ Retailer not found in retailers collection either`);
        }
      } else {
        const retailerUser = retailerUsersSnapshot.docs[0].data();
        console.log(`  ✅ Retailer found in retailerUsers collection:`);
        console.log(`    ID: ${retailerUsersSnapshot.docs[0].id}`);
        console.log(`    Retailer ID: ${retailerUser.retailerId}`);
        console.log(`    Name: ${retailerUser.name}`);
        console.log(`    Phone: ${retailerUser.phone}`);
        console.log(`    Tenant ID: ${retailerUser.tenantId}`);
      }
      
      // 5. Check line worker data
      if (payment.lineWorkerId) {
        console.log(`\n🔍 Checking line worker: ${payment.lineWorkerId}`);
        const lineWorkerDoc = await db.collection('users').doc(payment.lineWorkerId).get();
        
        if (lineWorkerDoc.exists) {
          const lineWorkerData = lineWorkerDoc.data();
          console.log(`  ✅ Line worker found:`);
          console.log(`    Name: ${lineWorkerData.displayName || lineWorkerData.name}`);
          console.log(`    Roles: ${lineWorkerData.roles}`);
          console.log(`    Wholesaler ID: ${lineWorkerData.wholesalerId}`);
          console.log(`    Phone: ${lineWorkerData.phone}`);
          
          // 6. Check wholesaler data
          if (lineWorkerData.wholesalerId) {
            console.log(`\n🔍 Checking wholesaler: ${lineWorkerData.wholesalerId}`);
            const wholesalerDoc = await db.collection('users').doc(lineWorkerData.wholesalerId).get();
            
            if (wholesalerDoc.exists) {
              const wholesalerData = wholesalerDoc.data();
              console.log(`  ✅ Wholesaler found:`);
              console.log(`    Name: ${wholesalerData.displayName || wholesalerData.name}`);
              console.log(`    Phone: ${wholesalerData.phone}`);
              console.log(`    Roles: ${wholesalerData.roles}`);
            } else {
              console.log(`  ❌ Wholesaler not found`);
            }
          }
        } else {
          console.log(`  ❌ Line worker not found`);
        }
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
  } catch (error) {
    console.error('❌ Error checking retailer data:', error);
  }
}

// Run the check
if (require.main === module) {
  checkRetailerData().then(() => {
    console.log('🎉 Retailer data check completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { checkRetailerData };