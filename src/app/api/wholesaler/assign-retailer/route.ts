// API for Wholesaler to Assign Existing Retailer
import { NextRequest, NextResponse } from 'next/server';
import { RetailerProfileService, RetailerAssignmentService } from '@/services/retailer-profile-service';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AssignRetailerRequest {
  phone: string; // Retailer's phone number
  tenantId: string; // Wholesaler's tenant ID
  assignment: {
    aliasName: string; // Wholesaler's alias for this retailer
    areaId?: string;
    zipcodes: string[];
    creditLimit?: number;
    notes?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Wholesaler assign retailer API called');
    
    const body: AssignRetailerRequest = await request.json();
    const { phone, tenantId, assignment } = body;
    
    if (!phone || !tenantId || !assignment?.aliasName) {
      return NextResponse.json(
        { error: 'Phone number, tenant ID, and alias name are required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Assignment data:', { 
      phone, 
      tenantId, 
      aliasName: assignment.aliasName,
      areaId: assignment.areaId 
    });
    
    // Verify tenant exists
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);
    
    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    const tenantData = tenantDoc.data();
    console.log('✅ Tenant verified:', tenantData.name);
    
    // Find retailer profile by phone
    const retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(phone);
    if (!retailerProfile) {
      return NextResponse.json(
        { error: 'Retailer not found. The retailer must create their profile first before you can assign them.' },
        { status: 404 }
      );
    }
    
    console.log('✅ Retailer found:', retailerProfile.profile?.realName || retailerProfile.name);
    
    // Check if assignment already exists
    const existingAssignment = await RetailerAssignmentService.getRetailerAssignment(tenantId, retailerProfile.id);
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'This retailer is already assigned to your business.' },
        { status: 409 }
      );
    }
    
    // Create assignment
    const assignmentId = await RetailerAssignmentService.createRetailerAssignment(
      tenantId, 
      retailerProfile.id, 
      assignment
    );
    
    return NextResponse.json({
      success: true,
      message: `Retailer "${retailerProfile.profile?.realName || retailerProfile.name}" has been assigned to your business as "${assignment.aliasName}".`,
      assignmentId,
      retailer: {
        id: retailerProfile.id,
        realName: retailerProfile.profile?.realName || retailerProfile.name,
        phone: retailerProfile.profile?.phone || retailerProfile.phone,
        isVerified: retailerProfile.verification?.isPhoneVerified || retailerProfile.phoneVerified || false
      },
      assignment: {
        aliasName: assignment.aliasName,
        areaId: assignment.areaId,
        zipcodes: assignment.zipcodes
      }
    });
    
  } catch (error) {
    console.error('❌ Error assigning retailer:', error);
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
    console.log('📋 Get wholesaler assignments API called');
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // Get all assignments for this wholesaler
    const assignments = await RetailerAssignmentService.getWholesalerAssignments(tenantId);
    
    // Get retailer profiles for each assignment
    const assignmentsWithRetailerInfo = await Promise.all(
      assignments.map(async (assignment) => {
        const retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(
          // Note: We'd need to store phone in assignment or get it from retailer profile
          assignment.retailerId
        );
        
        return {
          ...assignment,
          retailer: retailerProfile ? {
            id: retailerProfile.id,
            realName: retailerProfile.profile?.realName || retailerProfile.name,
            phone: retailerProfile.profile?.phone || retailerProfile.phone,
            isVerified: retailerProfile.verification?.isPhoneVerified || retailerProfile.phoneVerified || false
          } : null
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      assignments: assignmentsWithRetailerInfo
    });
    
  } catch (error) {
    console.error('❌ Error getting assignments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get assignments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}