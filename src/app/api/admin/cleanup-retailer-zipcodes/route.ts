// Cleanup utility to fix retailers with empty or problematic zipcodes
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, updateDoc, getFirestore, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of retailer zipcodes');
    
    // Get all retailer documents
    const retailersRef = collection(db, 'retailers');
    const querySnapshot = await getDocs(retailersRef);
    
    let fixedCount = 0;
    let alreadyOkCount = 0;
    const errors: string[] = [];
    const fixedRetailers: Array<{
      id: string;
      name: any;
      phone: any;
      fixes: string[];
    }> = [];
    
    for (const retailerDoc of querySnapshot.docs) {
      try {
        const retailerData = retailerDoc.data();
        const retailerId = retailerDoc.id;
        
        let needsFix = false;
        const updateData: any = {
          updatedAt: Timestamp.now()
        };
        
        // Check wholesalerAssignments for empty zipcodes
        if (retailerData.wholesalerAssignments) {
          const updatedAssignments = { ...retailerData.wholesalerAssignments };
          
          for (const [tenantId, assignment] of Object.entries(updatedAssignments)) {
            const assignmentData = assignment as any;
            
            // Fix empty or undefined zipcodes
            if (!assignmentData.zipcodes || !Array.isArray(assignmentData.zipcodes) || assignmentData.zipcodes.length === 0) {
              console.log(`🔧 Fixing empty zipcodes for retailer ${retailerId}, tenant ${tenantId}`);
              
              // Set default empty array if undefined
              if (!assignmentData.zipcodes || !Array.isArray(assignmentData.zipcodes)) {
                assignmentData.zipcodes = [];
              }
              
              // If areaId is "unknown", try to set a better default
              if (assignmentData.areaId === 'unknown') {
                assignmentData.areaId = 'default-area';
              }
              
              needsFix = true;
            }
          }
          
          if (needsFix) {
            updateData.wholesalerAssignments = updatedAssignments;
          }
        }
        
        // Check wholesalerData for missing currentZipcodes
        if (retailerData.wholesalerData) {
          const updatedWholesalerData = { ...retailerData.wholesalerData };
          
          for (const [tenantId, wholesalerInfo] of Object.entries(updatedWholesalerData)) {
            const wholesalerInfoData = wholesalerInfo as any;
            
            // Add missing currentZipcodes field
            if (!wholesalerInfoData.currentZipcodes) {
              console.log(`🔧 Adding missing currentZipcodes for retailer ${retailerId}, tenant ${tenantId}`);
              wholesalerInfoData.currentZipcodes = retailerData.zipcodes || [];
              needsFix = true;
            }
            
            // Add missing currentAreaId field
            if (!wholesalerInfoData.currentAreaId) {
              wholesalerInfoData.currentAreaId = wholesalerInfoData.areaId || retailerData.areaId || 'default-area';
              needsFix = true;
            }
          }
          
          if (needsFix) {
            updateData.wholesalerData = updatedWholesalerData;
          }
        }
        
        // Ensure base retailer has zipcodes array
        if (!retailerData.zipcodes || !Array.isArray(retailerData.zipcodes)) {
          updateData.zipcodes = [];
          needsFix = true;
        }
        
        // Apply the fix if needed
        if (needsFix) {
          const retailerRef = doc(db, 'retailers', retailerId);
          await updateDoc(retailerRef, updateData);
          
          fixedCount++;
          fixedRetailers.push({
            id: retailerId,
            name: retailerData.name || 'Unknown',
            phone: retailerData.phone || 'No phone',
            fixes: Object.keys(updateData).filter(key => key !== 'updatedAt')
          });
          
          console.log(`  ✅ Fixed retailer ${retailerId}`);
        } else {
          alreadyOkCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error fixing retailer ${retailerDoc.id}:`, error);
        errors.push(`Retailer ${retailerDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`\n🎉 Zipcode cleanup complete!`);
    console.log(`  Fixed: ${fixedCount} retailers`);
    console.log(`  Already OK: ${alreadyOkCount} retailers`);
    console.log(`  Errors: ${errors.length} retailers`);
    
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Zipcode cleanup completed',
      stats: {
        fixed: fixedCount,
        alreadyOk: alreadyOkCount,
        errors: errors.length,
        errorDetails: errors
      },
      fixedRetailers
    });
    
  } catch (error) {
    console.error('Zipcode cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}