/**
 * Data Recovery Script for Retailer wholesalerData
 * 
 * This script helps recover lost wholesalerData and wholesalerAssignments
 * from retailer documents that were accidentally cleared.
 */

import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';

interface RetailerData {
  id: string;
  tenantIds: string[];
  wholesalerData?: any;
  wholesalerAssignments?: any;
  areaId?: string;
  zipcodes?: string[];
  creditLimit?: number;
  currentBalance?: number;
  notes?: string;
  updatedAt?: Timestamp;
}

/**
 * Recover wholesalerData for retailers that have tenantIds but missing wholesalerData
 */
export async function recoverWholesalerDataForTenant(tenantId: string): Promise<{
  recovered: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    recovered: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🔍 Starting recovery for tenant: ${tenantId}`);
    
    // Get all retailers for this tenant
    const retailersRef = collection(db, 'retailers');
    const q = query(retailersRef, where('tenantIds', 'array-contains', tenantId));
    const querySnapshot = await getDocs(q);
    
    console.log(`📊 Found ${querySnapshot.size} retailers for tenant ${tenantId}`);
    
    for (const retailerDoc of querySnapshot.docs) {
      const retailerId = retailerDoc.id;
      const retailerData = retailerDoc.data() as RetailerData;
      
      try {
        // Check if wholesalerData is missing for this tenant
        if (!retailerData.wholesalerData || !retailerData.wholesalerData[tenantId]) {
          console.log(`🔧 Recovering data for retailer: ${retailerId}`);
          
          // Try to recover from wholesalerAssignments if available
          let recoveredData: any = null;
          
          if (retailerData.wholesalerAssignments && retailerData.wholesalerAssignments[tenantId]) {
            // Recover from wholesalerAssignments
            const assignment = retailerData.wholesalerAssignments[tenantId];
            recoveredData = {
              currentAreaId: assignment.areaId || retailerData.areaId || '',
              currentZipcodes: assignment.zipcodes || retailerData.zipcodes || [],
              assignedAt: assignment.assignedAt || Timestamp.now(),
              areaAssignmentHistory: [{
                areaId: assignment.areaId || retailerData.areaId || '',
                zipcodes: assignment.zipcodes || retailerData.zipcodes || [],
                assignedAt: assignment.assignedAt || Timestamp.now(),
                isActive: true
              }],
              notes: retailerData.notes || '',
              creditLimit: retailerData.creditLimit || 0,
              currentBalance: retailerData.currentBalance || 0
            };
            console.log(`✅ Recovered from wholesalerAssignments for ${retailerId}`);
          } else {
            // Create basic data structure
            recoveredData = {
              currentAreaId: retailerData.areaId || '',
              currentZipcodes: retailerData.zipcodes || [],
              assignedAt: Timestamp.now(),
              areaAssignmentHistory: [{
                areaId: retailerData.areaId || '',
                zipcodes: retailerData.zipcodes || [],
                assignedAt: Timestamp.now(),
                isActive: true
              }],
              notes: retailerData.notes || '',
              creditLimit: retailerData.creditLimit || 0,
              currentBalance: retailerData.currentBalance || 0
            };
            console.log(`⚠️ Created basic data structure for ${retailerId}`);
          }
          
          // Update the retailer document
          const retailerRef = doc(db, 'retailers', retailerId);
          const updatedWholesalerData = {
            ...retailerData.wholesalerData,
            [tenantId]: recoveredData
          };
          
          // Ensure wholesalerAssignments also exists
          const updatedWholesalerAssignments = {
            ...retailerData.wholesalerAssignments,
            [tenantId]: {
              areaId: recoveredData.currentAreaId,
              zipcodes: recoveredData.currentZipcodes,
              assignedAt: recoveredData.assignedAt
            }
          };
          
          await updateDoc(retailerRef, {
            wholesalerData: updatedWholesalerData,
            wholesalerAssignments: updatedWholesalerAssignments,
            updatedAt: Timestamp.now()
          });
          
          results.recovered++;
          console.log(`✅ Successfully recovered data for retailer: ${retailerId}`);
          
        } else {
          console.log(`ℹ️ Retailer ${retailerId} already has wholesalerData`);
        }
        
      } catch (error) {
        const errorMsg = `Failed to recover retailer ${retailerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        results.failed++;
        results.errors.push(errorMsg);
      }
    }
    
    console.log(`🎉 Recovery completed for tenant ${tenantId}:`, results);
    return results;
    
  } catch (error) {
    const errorMsg = `Recovery failed for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);
    return results;
  }
}

/**
 * Check all retailers for data integrity issues
 */
export async function checkRetailerDataIntegrity(tenantId: string): Promise<{
  total: number;
  intact: number;
  missingWholesalerData: number;
  missingWholesalerAssignments: number;
  issues: Array<{
    retailerId: string;
    issue: string;
    details: any;
  }>;
}> {
  const results = {
    total: 0,
    intact: 0,
    missingWholesalerData: 0,
    missingWholesalerAssignments: 0,
    issues: [] as Array<{
      retailerId: string;
      issue: string;
      details: any;
    }>
  };

  try {
    console.log(`🔍 Checking data integrity for tenant: ${tenantId}`);
    
    // Get all retailers for this tenant
    const retailersRef = collection(db, 'retailers');
    const q = query(retailersRef, where('tenantIds', 'array-contains', tenantId));
    const querySnapshot = await getDocs(q);
    
    results.total = querySnapshot.size;
    
    for (const retailerDoc of querySnapshot.docs) {
      const retailerId = retailerDoc.id;
      const retailerData = retailerDoc.data() as RetailerData;
      
      let hasIssues = false;
      
      // Check wholesalerData
      if (!retailerData.wholesalerData || !retailerData.wholesalerData[tenantId]) {
        results.missingWholesalerData++;
        results.issues.push({
          retailerId,
          issue: 'Missing wholesalerData',
          details: { hasWholesalerData: !!retailerData.wholesalerData }
        });
        hasIssues = true;
      }
      
      // Check wholesalerAssignments
      if (!retailerData.wholesalerAssignments || !retailerData.wholesalerAssignments[tenantId]) {
        results.missingWholesalerAssignments++;
        results.issues.push({
          retailerId,
          issue: 'Missing wholesalerAssignments',
          details: { hasWholesalerAssignments: !!retailerData.wholesalerAssignments }
        });
        hasIssues = true;
      }
      
      if (!hasIssues) {
        results.intact++;
      }
    }
    
    console.log(`📊 Data integrity check for tenant ${tenantId}:`, results);
    return results;
    
  } catch (error) {
    console.error(`❌ Data integrity check failed:`, error);
    return results;
  }
}

/**
 * API endpoint for data recovery
 */
export async function POST(request: Request) {
  try {
    const { tenantId, action } = await request.json();
    
    if (!tenantId) {
      return Response.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    if (action === 'check') {
      const integrity = await checkRetailerDataIntegrity(tenantId);
      return Response.json({
        success: true,
        action: 'check',
        data: integrity
      });
    } else if (action === 'recover') {
      const recovery = await recoverWholesalerDataForTenant(tenantId);
      return Response.json({
        success: true,
        action: 'recover',
        data: recovery
      });
    } else {
      return Response.json(
        { error: 'Invalid action. Use "check" or "recover"' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('❌ Recovery API error:', error);
    return Response.json(
      { 
        error: 'Recovery operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}