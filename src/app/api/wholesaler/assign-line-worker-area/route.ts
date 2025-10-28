// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { RetailerAssignmentService } from '@/services/retailer-profile-service';
import { UserService } from '@/services/firestore';
import { doc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AssignLineWorkerAreaRequest {
  tenantId: string;
  lineWorkerId: string;
  areaId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Assign line worker to area API called');
    
    const body: AssignLineWorkerAreaRequest = await request.json();
    const { tenantId, lineWorkerId, areaId } = body;
    
    if (!tenantId || !lineWorkerId || !areaId) {
      return NextResponse.json(
        { error: 'Tenant ID, line worker ID, and area ID are required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Assignment data:', { tenantId, lineWorkerId, areaId });
    
    // Verify tenant exists
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);
    
    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Verify line worker exists and belongs to tenant
    const lineWorkerRef = doc(db, 'users', lineWorkerId);
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
    
    console.log('✅ All verifications passed');
    
    // Assign area to line worker using existing service
    await UserService.assignAreasToUser(lineWorkerId, tenantId, [areaId]);
    
    // Get all retailer assignments for this tenant in the specified area
    const assignmentsRef = collection(db, 'retailerAssignments');
    const areaQuery = query(
      assignmentsRef,
      where('tenantId', '==', tenantId),
      where('areaId', '==', areaId)
    );
    const assignmentSnapshot = await getDocs(areaQuery);
    
    console.log(`📋 Found ${assignmentSnapshot.docs.length} retailers in area ${areaId}`);
    
    // Update all retailer assignments in this area to assign to the line worker
    const updatedRetailers = [];
    
    for (const assignmentDoc of assignmentSnapshot.docs) {
      const assignmentId = assignmentDoc.id;
      const assignmentData = assignmentDoc.data();
      
      // Update the assignment with the new line worker
      await RetailerAssignmentService.updateRetailerAssignment(
        tenantId,
        assignmentData.retailerId,
        {
          assignedLineWorkerId: lineWorkerId
        }
      );
      
      updatedRetailers.push({
        retailerId: assignmentData.retailerId,
        aliasName: assignmentData.aliasName,
        assignmentId: assignmentId
      });
    }
    
    console.log(`✅ Assigned ${updatedRetailers.length} retailers to line worker ${lineWorkerId}`);
    
    return NextResponse.json({
      success: true,
      message: `Line worker has been assigned to area "${areaData.name}" with ${updatedRetailers.length} retailer(s).`,
      assignment: {
        tenantId,
        lineWorkerId,
        lineWorkerName: lineWorkerData.displayName || lineWorkerData.email,
        areaId,
        areaName: areaData.name,
        areaZipcodes: areaData.zipcodes || []
      },
      retailers: updatedRetailers,
      summary: {
        totalRetailersInArea: updatedRetailers.length,
        areaName: areaData.name,
        lineWorkerName: lineWorkerData.displayName || lineWorkerData.email
      }
    });
    
  } catch (error) {
    console.error('❌ Error assigning line worker to area:', error);
    return NextResponse.json(
      { 
        error: 'Assignment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Get line worker area assignments API called');
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const lineWorkerId = searchParams.get('lineWorkerId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    if (lineWorkerId) {
      // Get specific line worker's assignments
      const lineWorkerRef = doc(db, 'users', lineWorkerId);
      const lineWorkerDoc = await getDoc(lineWorkerRef);
      
      if (!lineWorkerDoc.exists()) {
        return NextResponse.json(
          { error: 'Line worker not found' },
          { status: 404 }
        );
      }
      
      const lineWorkerData = lineWorkerDoc.data();
      
      // Get assigned areas
      const assignedAreas = lineWorkerData.assignedAreas || [];
      
      // Get retailers assigned to this line worker
      const assignmentsRef = collection(db, 'retailerAssignments');
      const workerQuery = query(
        assignmentsRef,
        where('tenantId', '==', tenantId),
        where('assignedLineWorkerId', '==', lineWorkerId)
      );
      const assignmentSnapshot = await getDocs(workerQuery);
      
      const retailers = assignmentSnapshot.docs.map(doc => ({
        retailerId: doc.data().retailerId,
        aliasName: doc.data().aliasName,
        areaId: doc.data().areaId,
        zipcodes: doc.data().zipcodes,
        creditLimit: doc.data().creditLimit,
        currentBalance: doc.data().currentBalance
      }));
      
      return NextResponse.json({
        lineWorker: {
          id: lineWorkerId,
          name: lineWorkerData.displayName || lineWorkerData.email,
          assignedAreas,
          totalRetailers: retailers.length
        },
        retailers
      });
      
    } else {
      // Get all line workers and their area assignments for tenant
      const usersRef = collection(db, 'users');
      const workersQuery = query(
        usersRef,
        where('tenantId', '==', tenantId),
        where('roles', 'array-contains', 'LINE_WORKER'),
        where('active', '==', true)
      );
      const workerSnapshot = await getDocs(workersQuery);
      
      const lineWorkers = await Promise.all(
        workerSnapshot.docs.map(async (workerDoc) => {
          const workerData = workerDoc.data();
          const assignedAreas = workerData.assignedAreas || [];
          
          // Get retailer count for this worker
          const assignmentsRef = collection(db, 'retailerAssignments');
          const workerQuery = query(
            assignmentsRef,
            where('tenantId', '==', tenantId),
            where('assignedLineWorkerId', '==', workerDoc.id)
          );
          const assignmentSnapshot = await getDocs(workerQuery);
          
          return {
            id: workerDoc.id,
            name: workerData.displayName || workerData.email,
            email: workerData.email,
            assignedAreas,
            totalRetailers: assignmentSnapshot.size,
            isActive: workerData.active
          };
        })
      );
      
      return NextResponse.json({
        tenantId,
        lineWorkers
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting line worker assignments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get assignments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}