// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { RetailerAssignmentService } from '@/services/retailer-profile-service';
import { UserService } from '@/services/firestore';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReassignRetailerRequest {
  retailerId?: string;     // For single retailer reassignment
  tenantId: string;
  newLineWorkerId: string;
  areaId?: string;        // For area-based assignment
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Enhanced reassign retailer API called');
    
    const body: ReassignRetailerRequest = await request.json();
    const { retailerId, tenantId, newLineWorkerId, areaId } = body;
    
    if (!tenantId || !newLineWorkerId) {
      return NextResponse.json(
        { error: 'Tenant ID and new Line Worker ID are required' },
        { status: 400 }
      );
    }
    
    if (!retailerId && !areaId) {
      return NextResponse.json(
        { error: 'Either retailer ID or area ID is required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Reassignment request:', {
      retailerId,
      tenantId,
      newLineWorkerId,
      areaId
    });
    
    // Verify line worker exists and belongs to tenant
    const lineWorkerRef = doc(db, 'users', newLineWorkerId);
    const lineWorkerDoc = await getDoc(lineWorkerRef);
    
    if (!lineWorkerDoc.exists()) {
      return NextResponse.json(
        { error: 'Line worker not found' },
        { status: 404 }
      );
    }
    
    const lineWorkerData = lineWorkerDoc.data();
    if (lineWorkerData.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Line worker does not belong to this tenant' },
        { status: 403 }
      );
    }
    
    let updatedRetailers: any[] = [];
    
    if (areaId) {
      // Area-based assignment
      console.log('📍 Processing area-based assignment');
      
      // Verify area exists and belongs to tenant
      const areaRef = doc(db, 'areas', areaId);
      const areaDoc = await getDoc(areaRef);
      
      if (!areaDoc.exists()) {
        return NextResponse.json(
          { error: 'Area not found' },
          { status: 404 }
        );
      }
      
      const areaData = areaDoc.data();
      if (!areaData.tenantIds || !areaData.tenantIds.includes(tenantId)) {
        return NextResponse.json(
          { error: 'Area does not belong to this tenant' },
          { status: 403 }
        );
      }
      
      // Assign area to line worker
      const userService = new UserService();
      await userService.assignAreasToUser(newLineWorkerId, tenantId, [areaId]);
      
      // Get all retailer assignments in this area
      const assignmentsRef = collection(db, 'retailerAssignments');
      const areaQuery = query(
        assignmentsRef,
        where('tenantId', '==', tenantId),
        where('areaId', '==', areaId)
      );
      const assignmentSnapshot = await getDocs(areaQuery);
      
      // Update all retailer assignments in this area
      for (const assignmentDoc of assignmentSnapshot.docs) {
        const assignmentData = assignmentDoc.data();
        
        await RetailerAssignmentService.updateRetailerAssignment(
          tenantId,
          assignmentData.retailerId,
          {
            assignedLineWorkerId: newLineWorkerId
          }
        );
        
        updatedRetailers.push({
          retailerId: assignmentData.retailerId,
          aliasName: assignmentData.aliasName,
          assignmentId: assignmentDoc.id
        });
      }
      
      return NextResponse.json({
        success: true,
        message: `Line worker has been assigned to area "${areaData.name}" with ${updatedRetailers.length} retailer(s).`,
        assignment: {
          tenantId,
          lineWorkerId: newLineWorkerId,
          lineWorkerName: lineWorkerData.displayName || lineWorkerData.email,
          areaId,
          areaName: areaData.name
        },
        retailers: updatedRetailers,
        summary: {
          totalRetailersInArea: updatedRetailers.length,
          areaName: areaData.name,
          lineWorkerName: lineWorkerData.displayName || lineWorkerData.email
        }
      });
      
    } else {
      // Single retailer assignment
      console.log('👤 Processing single retailer assignment');
      
      // Perform the reassignment using existing service
      await retailerService.reassignRetailerToLineWorker(retailerId!, tenantId, newLineWorkerId);
      
      // Also update in new assignment system
      try {
        await RetailerAssignmentService.updateRetailerAssignment(
          tenantId,
          retailerId!,
          {
            assignedLineWorkerId: newLineWorkerId
          }
        );
      } catch (assignmentError: any) {
        console.log('⚠️  Assignment update failed, trying to create assignment:', assignmentError.message);
        
        // If assignment doesn't exist, try to create it
        if (assignmentError.message.includes('No document to update') || 
            assignmentError.message.includes('Missing or insufficient permissions')) {
          
          // Get retailer data to create assignment
          const retailer = await retailerService.getById(retailerId!, tenantId);
          if (retailer) {
            // Prepare assignment data, filtering out undefined values
            const assignmentData: any = {
              aliasName: retailer.profile ? retailer.profile.realName : retailer.name || 'Unknown',
              zipcodes: retailer.zipcodes || [],
              creditLimit: 0,
              notes: 'Auto-created during reassignment'
            };
            
            // Only include areaId if it exists
            if (retailer.areaId) {
              assignmentData.areaId = retailer.areaId;
            }
            
            await RetailerAssignmentService.createRetailerAssignment(
              tenantId,
              retailerId!,
              assignmentData
            );
            
            // Now update the assignment with line worker
            await RetailerAssignmentService.updateRetailerAssignment(
              tenantId,
              retailerId!,
              {
                assignedLineWorkerId: newLineWorkerId
              }
            );
            
            console.log('✅ Created and updated retailer assignment');
          }
        } else {
          throw assignmentError;
        }
      }
      
      updatedRetailers.push({
        retailerId,
        lineWorkerId: newLineWorkerId
      });
      
      return NextResponse.json({
        success: true,
        message: 'Retailer reassigned successfully',
        retailer: {
          retailerId,
          newLineWorkerId,
          lineWorkerName: lineWorkerData.displayName || lineWorkerData.email
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error reassigning retailer:', error);
    return NextResponse.json(
      { 
        error: 'Reassignment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}