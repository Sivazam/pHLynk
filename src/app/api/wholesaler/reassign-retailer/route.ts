// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';

interface ReassignRetailerRequest {
  retailerId: string;
  tenantId: string;
  newLineWorkerId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Reassign retailer to line worker API called');
    
    const body: ReassignRetailerRequest = await request.json();
    const { retailerId, tenantId, newLineWorkerId } = body;
    
    if (!retailerId || !tenantId || !newLineWorkerId) {
      return NextResponse.json(
        { error: 'Retailer ID, Tenant ID, and new Line Worker ID are required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Reassigning retailer:', {
      retailerId,
      tenantId,
      newLineWorkerId
    });
    
    // Perform the reassignment using RetailerService
    await retailerService.reassignRetailerToLineWorker(retailerId, tenantId, newLineWorkerId);
    
    return NextResponse.json({
      success: true,
      message: 'Retailer reassigned successfully'
    });
    
  } catch (error) {
    console.error('❌ Error reassigning retailer:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}