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
 * Migration script to convert retailer documents from wholesalerAssignments to wholesalerData structure
 * This creates isolated sub-documents for each wholesaler/tenant with comprehensive data tracking
 */
export async function migrateRetailerToWholesalerData() {
  try {
    console.log('🔄 Starting retailer to wholesalerData migration...');
    
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
          if (retailerData.wholesalerData && Object.keys(retailerData.wholesalerData).length > 0) {
            console.log(`⏭️  Skipping retailer ${retailerDoc.id} - already has wholesalerData`);
            skippedCount++;
            continue;
          }
          
          // Check if has wholesalerAssignments to migrate
          if (retailerData.wholesalerAssignments && Object.keys(retailerData.wholesalerAssignments).length > 0) {
            const wholesalerData: any = {};
            
            // Convert each wholesaler assignment to the new structure
            Object.entries(retailerData.wholesalerAssignments).forEach(([tenantId, assignment]: [string, any]) => {
              wholesalerData[tenantId] = {
                currentAreaId: assignment.areaId || '',
                currentZipcodes: assignment.zipcodes || [],
                assignedAt: assignment.assignedAt || Timestamp.now(),
                areaAssignmentHistory: [{
                  areaId: assignment.areaId || '',
                  zipcodes: assignment.zipcodes || [],
                  assignedAt: assignment.assignedAt || Timestamp.now(),
                  isActive: true
                }],
                // Set default values for new fields
                notes: '',
                creditLimit: 0,
                currentBalance: 0
              };
            });
            
            // Update the document
            const retailerRef = doc(db, 'retailers', retailerDoc.id);
            batch.update(retailerRef, {
              wholesalerData: wholesalerData,
              // Keep wholesalerAssignments for backward compatibility during transition
              updatedAt: Timestamp.now()
            });
            
            console.log(`✅ Migrating retailer ${retailerDoc.id}: ${retailerData.name} -> wholesalerData for ${Object.keys(wholesalerData).length} tenants`);
            migratedCount++;
          } else {
            console.log(`⚠️  Retailer ${retailerDoc.id} has no wholesalerAssignments - creating empty wholesalerData`);
            const retailerRef = doc(db, 'retailers', retailerDoc.id);
            batch.update(retailerRef, {
              wholesalerData: {},
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
    
    console.log('🎉 Retailer to wholesalerData migration completed!');
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
    console.error('❌ Critical error during retailer to wholesalerData migration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to add or update wholesaler data for a retailer
 */
export async function upsertWholesalerData(
  retailerId: string, 
  tenantId: string, 
  data: {
    areaId?: string;
    zipcodes?: string[];
    notes?: string;
    creditLimit?: number;
    currentBalance?: number;
  }
): Promise<boolean> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      console.error('❌ Retailer not found:', retailerId);
      return false;
    }
    
    const retailerData = retailerDoc.data();
    let wholesalerData = retailerData.wholesalerData || {};
    
    const now = Timestamp.now();
    const existingData = wholesalerData[tenantId];
    
    // Prepare the updated wholesaler data
    const updatedWholesalerData = {
      currentAreaId: data.areaId || existingData?.currentAreaId || '',
      currentZipcodes: data.zipcodes || existingData?.currentZipcodes || [],
      assignedAt: existingData?.assignedAt || now,
      areaAssignmentHistory: existingData?.areaAssignmentHistory || [],
      notes: data.notes !== undefined ? data.notes : (existingData?.notes || ''),
      creditLimit: data.creditLimit !== undefined ? data.creditLimit : (existingData?.creditLimit || 0),
      currentBalance: data.currentBalance !== undefined ? data.currentBalance : (existingData?.currentBalance || 0)
    };
    
    // Update area assignment history if area changed
    if (data.areaId && data.areaId !== existingData?.currentAreaId) {
      // Mark previous assignment as inactive
      updatedWholesalerData.areaAssignmentHistory = updatedWholesalerData.areaAssignmentHistory.map(history => ({
        ...history,
        isActive: false
      }));
      
      // Add new assignment
      updatedWholesalerData.areaAssignmentHistory.push({
        areaId: data.areaId,
        zipcodes: data.zipcodes || [],
        assignedAt: now,
        isActive: true
      });
    }
    
    // Update the wholesaler data
    wholesalerData[tenantId] = updatedWholesalerData;
    
    await updateDoc(retailerRef, {
      wholesalerData: wholesalerData,
      updatedAt: now
    });
    
    console.log(`✅ Updated wholesaler data for retailer ${retailerId}, tenant ${tenantId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating wholesaler data for retailer ${retailerId}:`, error);
    return false;
  }
}

/**
 * Helper function to get wholesaler-specific data for a retailer
 */
export async function getWholesalerData(retailerId: string, tenantId: string): Promise<any | null> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      return null;
    }
    
    const retailerData = retailerDoc.data();
    const wholesalerData = retailerData.wholesalerData || {};
    
    return wholesalerData[tenantId] || null;
    
  } catch (error) {
    console.error(`❌ Error getting wholesaler data for retailer ${retailerId}:`, error);
    return null;
  }
}

/**
 * Helper function to remove wholesaler data for a retailer
 */
export async function removeWholesalerData(retailerId: string, tenantId: string): Promise<boolean> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (!retailerDoc.exists()) {
      console.error('❌ Retailer not found:', retailerId);
      return false;
    }
    
    const retailerData = retailerDoc.data();
    let wholesalerData = retailerData.wholesalerData || {};
    
    // Remove the tenant data
    delete wholesalerData[tenantId];
    
    await updateDoc(retailerRef, {
      wholesalerData: wholesalerData,
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ Removed wholesaler data for retailer ${retailerId}, tenant ${tenantId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error removing wholesaler data for retailer ${retailerId}:`, error);
    return false;
  }
}