// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { RetailerAuthService } from '@/services/retailer-auth';

interface RetailerLookupRequest {
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RetailerLookupRequest = await request.json();
    const { phone } = body;

    console.log('🔍 Retailer lookup request for phone:', phone);

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // First try to find retailer in retailers collection
    let retailer = await retailerService.getRetailerByPhone(cleanPhone);
    
    // If not found, try retailerUsers collection as fallback
    if (!retailer) {
      console.log('🔍 Retailer not found in retailers collection, checking retailerUsers...');
      const retailerUser = await RetailerAuthService.getRetailerUserByPhone(cleanPhone);
      
      if (retailerUser) {
        console.log('✅ Found retailer user, but no retailer document exists');
        // Return user info but indicate no retailer document
        return NextResponse.json({
          retailer: null,
          retailerUser: {
            id: retailerUser.id,
            phone: retailerUser.phone,
            name: retailerUser.name,
            hasDocument: false
          },
          message: 'Retailer user found but no retailer document exists'
        });
      }
    }

    if (retailer) {
      console.log('✅ Retailer found:', retailer.id);
      
      // Don't expose tenant information for privacy
      const safeRetailer = {
        id: retailer.id,
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address,
        zipcodes: retailer.zipcodes,
        // Note: We intentionally don't return tenantIds for privacy
      };

      return NextResponse.json({
        retailer: safeRetailer,
        message: 'Retailer found successfully'
      });
    }

    console.log('ℹ️ No retailer found for phone:', cleanPhone);
    
    return NextResponse.json({
      retailer: null,
      message: 'No retailer found with this phone number'
    });

  } catch (error) {
    console.error('❌ Error in retailer lookup:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to lookup retailer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}