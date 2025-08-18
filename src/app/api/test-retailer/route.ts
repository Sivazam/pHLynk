import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { RetailerAuthService } from '@/services/retailer-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Please provide phone parameter' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing retailer service for phone:', phone);

    // Step 1: Get retailer user by phone
    const retailerUser = await RetailerAuthService.getRetailerUserByPhone(phone);
    console.log('👤 Retailer user:', retailerUser);

    if (!retailerUser) {
      return NextResponse.json({
        success: false,
        error: 'Retailer user not found'
      });
    }

    // Step 2: Try to get retailer data
    console.log('🏪 Attempting to get retailer data...');
    console.log('Retailer ID:', retailerUser.retailerId);
    console.log('Tenant ID:', retailerUser.tenantId);

    const retailer = await retailerService.getById(retailerUser.tenantId, retailerUser.retailerId);
    console.log('🏪 Retailer data:', retailer);

    return NextResponse.json({
      success: true,
      retailerUser,
      retailer,
      tenantId: retailerUser.tenantId,
      retailerId: retailerUser.retailerId
    });

  } catch (error) {
    console.error('❌ Error in test API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}