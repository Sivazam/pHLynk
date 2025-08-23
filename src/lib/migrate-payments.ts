import { db, COLLECTIONS } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { retailerService } from '@/services/firestore';

/**
 * Migration function to add retailerName to existing payments that don't have it
 * This should be run once to update historical payments
 */
export async function migratePaymentsWithRetailerName() {
  try {
    console.log('🔄 Starting payment migration to add retailerName...');
    
    // Get all payments from all tenants
    // Note: This is a simplified approach - in production you might want to tenant-by-tenant
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    const paymentsSnapshot = await getDocs(paymentsRef);
    
    console.log(`📊 Found ${paymentsSnapshot.size} payments to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const paymentDoc of paymentsSnapshot.docs) {
      try {
        const paymentData = paymentDoc.data();
        
        // Skip if already has retailerName
        if (paymentData.retailerName) {
          skippedCount++;
          continue;
        }
        
        const paymentId = paymentDoc.id;
        const retailerId = paymentData.retailerId;
        const tenantId = paymentData.tenantId;
        
        if (!retailerId || !tenantId) {
          console.log(`⚠️ Payment ${paymentId} missing retailerId or tenantId, skipping`);
          skippedCount++;
          continue;
        }
        
        // Get retailer details
        const retailer = await retailerService.getById(retailerId, tenantId);
        
        if (!retailer) {
          console.log(`⚠️ Retailer ${retailerId} not found for payment ${paymentId}, skipping`);
          skippedCount++;
          continue;
        }
        
        // Update payment with retailerName
        await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId), {
          retailerName: retailer.name
        });
        
        console.log(`✅ Updated payment ${paymentId} with retailerName: ${retailer.name}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating payment ${paymentDoc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log(`📊 Results:`);
    console.log(`  ✅ Updated: ${updatedCount} payments`);
    console.log(`  ⏭️  Skipped: ${skippedCount} payments`);
    console.log(`  ❌ Errors: ${errorCount} payments`);
    
    return {
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Function to update a single payment with retailerName
 * Useful for updating payments individually when needed
 */
export async function updatePaymentWithRetailerName(paymentId: string) {
  try {
    // Get payment details
    const paymentRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
    const paymentDoc = await getDoc(paymentRef);
    
    if (!paymentDoc.exists()) {
      throw new Error('Payment not found');
    }
    
    const paymentData = paymentDoc.data();
    
    // Skip if already has retailerName
    if (paymentData.retailerName) {
      console.log(`Payment ${paymentId} already has retailerName: ${paymentData.retailerName}`);
      return { success: true, message: 'Already has retailerName' };
    }
    
    const retailerId = paymentData.retailerId;
    const tenantId = paymentData.tenantId;
    
    if (!retailerId || !tenantId) {
      throw new Error('Payment missing retailerId or tenantId');
    }
    
    // Get retailer details
    const retailer = await retailerService.getById(retailerId, tenantId);
    
    if (!retailer) {
      throw new Error('Retailer not found');
    }
    
    // Update payment with retailerName
    await updateDoc(paymentRef, {
      retailerName: retailer.name
    });
    
    console.log(`✅ Updated payment ${paymentId} with retailerName: ${retailer.name}`);
    
    return {
      success: true,
      paymentId,
      retailerName: retailer.name
    };
    
  } catch (error) {
    console.error(`❌ Error updating payment ${paymentId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}