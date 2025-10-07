import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';

/**
 * Migration script to convert retailer documents from single tenantId to tenantIds array
 * This should be run once to update existing retailer documents
 */
export async function migrateRetailerTenants() {
  try {
    console.log('🔄 Starting retailer tenant migration...');
    
    // Get all retailer documents
    const retailersRef = collection(db, 'retailers');
    const retailersSnapshot = await getDocs(retailersRef);
    
    console.log(`📊 Found ${retailersSnapshot.size} retailers to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process in batches of 500 to avoid Firestore limits
    const batchSize = 500;
    const retailers = retailersSnapshot.docs;
    
    for (let i = 0; i < retailers.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchEnd = Math.min(i + batchSize, retailers.length);
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: retailers ${i + 1}-${batchEnd}`);
      
      for (let j = i; j < batchEnd; j++) {
        const retailerDoc = retailers[j];
        const retailerData = retailerDoc.data();
        
        try {
          // Check if already migrated
          if (retailerData.tenantIds && Array.isArray(retailerData.tenantIds)) {
            console.log(`⏭️  Skipping retailer ${retailerDoc.id} - already migrated`);
            skippedCount++;
            continue;
          }
          
          // Check if has tenantId to migrate
          if (retailerData.tenantId) {
            const tenantIds = [retailerData.tenantId];
            
            // Update the document
            const retailerRef = doc(db, 'retailers', retailerDoc.id);
            batch.update(retailerRef, {
              tenantIds: tenantIds,
              tenantId: null, // Remove old field (optional, can keep for backward compatibility)
              updatedAt: Timestamp.now()
            });
            
            console.log(`✅ Migrating retailer ${retailerDoc.id}: ${retailerData.name} -> tenantIds: [${retailerData.tenantId}]`);
            migratedCount++;
          } else {
            console.log(`⚠️  Retailer ${retailerDoc.id} has no tenantId - creating empty array`);
            const retailerRef = doc(db, 'retailers', retailerDoc.id);
            batch.update(retailerRef, {
              tenantIds: [],
              updatedAt: Timestamp.now()
            });
            migratedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing retailer ${retailerDoc.id}:`, error);
          errorCount++;
        }
      }
      
      // Commit the batch
      try {
        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} committed successfully`);
      } catch (batchError) {
        console.error(`❌ Error committing batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        errorCount += batchEnd - i;
      }
    }
    
    console.log('🎉 Retailer tenant migration completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Total retailers: ${retailersSnapshot.size}`);
    console.log(`  - Migrated: ${migratedCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    return {
      success: true,
      total: retailersSnapshot.size,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Critical error during retailer tenant migration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to add a tenantId to a retailer's tenantIds array
 */
export async function addTenantToRetailer(retailerId: string, tenantId: string): Promise<boolean> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      console.error('❌ Retailer not found:', retailerId);
      return false;
    }
    
    const retailerData = retailerDoc.data();
    let tenantIds = retailerData.tenantIds || [];
    
    // Initialize tenantIds array if it doesn't exist
    if (!Array.isArray(tenantIds)) {
      tenantIds = retailerData.tenantId ? [retailerData.tenantId] : [];
    }
    
    // Check if tenantId already exists
    if (tenantIds.includes(tenantId)) {
      console.log(`ℹ️  Tenant ${tenantId} already exists for retailer ${retailerId}`);
      return true;
    }
    
    // Add the new tenantId
    tenantIds.push(tenantId);
    
    await updateDoc(retailerRef, {
      tenantIds: tenantIds,
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ Added tenant ${tenantId} to retailer ${retailerId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error adding tenant to retailer ${retailerId}:`, error);
    return false;
  }
}

/**
 * Helper function to remove a tenantId from a retailer's tenantIds array
 */
export async function removeTenantFromRetailer(retailerId: string, tenantId: string): Promise<boolean> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      console.error('❌ Retailer not found:', retailerId);
      return false;
    }
    
    const retailerData = retailerDoc.data();
    let tenantIds = retailerData.tenantIds || [];
    
    // Initialize tenantIds array if it doesn't exist
    if (!Array.isArray(tenantIds)) {
      tenantIds = retailerData.tenantId ? [retailerData.tenantId] : [];
    }
    
    // Remove the tenantId
    const updatedTenantIds = tenantIds.filter(id => id !== tenantId);
    
    if (updatedTenantIds.length === tenantIds.length) {
      console.log(`ℹ️  Tenant ${tenantId} not found for retailer ${retailerId}`);
      return true;
    }
    
    await updateDoc(retailerRef, {
      tenantIds: updatedTenantIds,
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ Removed tenant ${tenantId} from retailer ${retailerId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error removing tenant from retailer ${retailerId}:`, error);
    return false;
  }
}

/**
 * Helper function to check if a retailer is associated with a tenant
 */
export async function isRetailerAssociatedWithTenant(retailerId: string, tenantId: string): Promise<boolean> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      return false;
    }
    
    const retailerData = retailerDoc.data();
    let tenantIds = retailerData.tenantIds || [];
    
    // Handle backward compatibility
    if (!Array.isArray(tenantIds)) {
      tenantIds = retailerData.tenantId ? [retailerData.tenantId] : [];
    }
    
    return tenantIds.includes(tenantId);
    
  } catch (error) {
    console.error(`❌ Error checking tenant association for retailer ${retailerId}:`, error);
    return false;
  }
}