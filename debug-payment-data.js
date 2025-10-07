/**
 * Debug script to check actual payment data structure
 * This will help us understand what retailerId and other data is being used
 */

const { doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');
const { db } = require('./src/lib/firebase');

async function debugPaymentData() {
  console.log('🔍 Debugging Payment Data Structure...\n');
  
  try {
    // 1. Check recent payments
    console.log('📋 Checking recent payments...');
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(
      query(paymentsRef, where('state', '==', 'COMPLETED'), orderBy('createdAt', 'desc'), limit(5))
    );
    
    if (paymentsSnapshot.empty) {
      console.log('❌ No recent completed payments found');
      return;
    }
    
    console.log(`✅ Found ${paymentsSnapshot.docs.length} recent payments:\n`);
    
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
      const retailerUsersRef = collection(db, 'retailerUsers');
      const retailerUsersQuery = query(
        retailerUsersRef, 
        where('retailerId', '==', payment.retailerId),
        limit(1)
      );
      const retailerUsersSnapshot = await getDocs(retailerUsersQuery);
      
      if (retailerUsersSnapshot.empty) {
        console.log(`  ❌ Retailer not found in retailerUsers collection`);
        
        // 3. Check if retailer exists in retailers collection
        console.log(`\n🔍 Checking retailers collection for ID: ${payment.retailerId}`);
        const retailerRef = doc(db, 'retailers', payment.retailerId);
        const retailerDoc = await getDoc(retailerRef);
        
        if (retailerDoc.exists()) {
          const retailerData = retailerDoc.data();
          console.log(`  ✅ Retailer found in retailers collection:`);
          console.log(`    Name: ${retailerData.name}`);
          console.log(`    Phone: ${retailerData.phone}`);
          console.log(`    Address: ${retailerData.address}`);
          console.log(`    Area ID: ${retailerData.areaId}`);
          
          // 4. Check if there's a corresponding retailerUser
          console.log(`\n🔍 Looking for retailerUser with phone: ${retailerData.phone}`);
          const retailerUserByPhoneQuery = query(
            retailerUsersRef,
            where('phone', '==', retailerData.phone),
            limit(1)
          );
          const retailerUserByPhoneSnapshot = await getDocs(retailerUserByPhoneQuery);
          
          if (!retailerUserByPhoneSnapshot.empty) {
            const retailerUser = retailerUserByPhoneSnapshot.docs[0].data();
            console.log(`  ✅ Found retailerUser by phone:`);
            console.log(`    ID: ${retailerUserByPhoneSnapshot.docs[0].id}`);
            console.log(`    Retailer ID: ${retailerUser.retailerId}`);
            console.log(`    Name: ${retailerUser.name}`);
            console.log(`    Phone: ${retailerUser.phone}`);
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
        console.log(`    Name: ${retailerUser.name}`);
        console.log(`    Phone: ${retailerUser.phone}`);
      }
      
      // 5. Check line worker data
      if (payment.lineWorkerId) {
        console.log(`\n🔍 Checking line worker: ${payment.lineWorkerId}`);
        const lineWorkerRef = doc(db, 'users', payment.lineWorkerId);
        const lineWorkerDoc = await getDoc(lineWorkerRef);
        
        if (lineWorkerDoc.exists()) {
          const lineWorkerData = lineWorkerDoc.data();
          console.log(`  ✅ Line worker found:`);
          console.log(`    Name: ${lineWorkerData.displayName || lineWorkerData.name}`);
          console.log(`    Roles: ${lineWorkerData.roles}`);
          console.log(`    Wholesaler ID: ${lineWorkerData.wholesalerId}`);
          console.log(`    Phone: ${lineWorkerData.phone}`);
          
          // 6. Check wholesaler data
          if (lineWorkerData.wholesalerId) {
            console.log(`\n🔍 Checking wholesaler: ${lineWorkerData.wholesalerId}`);
            const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
            const wholesalerDoc = await getDoc(wholesalerRef);
            
            if (wholesalerDoc.exists()) {
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
    console.error('❌ Error debugging payment data:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugPaymentData();
}

module.exports = { debugPaymentData };