import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Wholesalers API called')
    
    const session = await getServerSession(authOptions);
    console.log('📝 Session:', session ? 'Found' : 'Not found')
    
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    console.log('👤 User role:', session.user?.role)
    
    if (!session.user || session.user.role !== 'RETAILER') {
      console.log('❌ User not authorized or not a retailer')
      return NextResponse.json({ error: 'Unauthorized - Not a retailer' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get('retailerId');

    console.log('🆔 Retailer ID from params:', retailerId)

    if (!retailerId) {
      return NextResponse.json({ error: 'Retailer ID is required' }, { status: 400 });
    }

    // Follow the exact same approach as the dashboard
    // Step 1: Get retailer user data using RetailerAuthService
    console.log('🔍 Step 1: Getting retailer user data for:', retailerId)
    let retailerUserData;
    try {
      const { RetailerAuthService } = await import('@/services/retailer-auth');
      retailerUserData = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
      if (!retailerUserData) {
        console.log('❌ No retailer user data found for retailerId:', retailerId)
        return NextResponse.json({
          success: true,
          data: {
            wholesalers: [],
          },
        });
      }
      console.log('✅ Retailer user data found:', {
        name: retailerUserData.name,
        retailerId: retailerUserData.retailerId,
        tenantId: retailerUserData.tenantId
      })
    } catch (error) {
      console.error('❌ Error getting retailer user data:', error)
      return NextResponse.json({
        success: true,
        data: {
          wholesalers: [],
        },
      });
    }

    // Step 2: Fetch retailer document using retailerId (same as dashboard)
    console.log('🔍 Step 2: Fetching retailer document for:', retailerId)
    let retailerData;
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        retailerData = {
          id: retailerId,
          ...retailerDoc.data()
        };
        console.log('✅ Retailer document found:', {
          name: retailerData.name,
          tenantIds: retailerData.tenantIds
        })
      } else {
        console.log('⚠️ Retailer document not found, using fallback data')
        // Fallback to user data (same as dashboard)
        retailerData = {
          id: retailerUserData.retailerId,
          name: retailerUserData.name,
          phone: retailerUserData.phone,
          email: retailerUserData.email || '',
          tenantId: retailerUserData.tenantId,
          address: retailerUserData.address || 'Address not specified',
          areaId: '',
          zipcodes: []
        };
      }
    } catch (error) {
      console.error('❌ Error accessing retailer document:', error)
      // Fallback to user data (same as dashboard)
      retailerData = {
        id: retailerUserData.retailerId,
        name: retailerUserData.name,
        phone: retailerUserData.phone,
        email: retailerUserData.email || '',
        tenantId: retailerUserData.tenantId,
        address: retailerUserData.address || 'Address not specified',
        areaId: '',
        zipcodes: []
      };
    }

    // Step 3: Get tenantIds (same as dashboard logic)
    const retailerTenants = retailerData.tenantIds || [retailerUserData.tenantId];
    console.log('🏢 Step 3: Available tenant IDs:', retailerTenants)

    if (retailerTenants.length === 0) {
      console.log('⚠️ No tenant IDs found')
      return NextResponse.json({
        success: true,
        data: {
          wholesalers: [],
        },
      });
    }

    // Step 4: Fetch wholesaler details from tenants collection (same as dashboard)
    console.log('🔍 Step 4: Fetching wholesalers from tenants collection')
    const wholesalers: any[] = [];
    for (const tenantId of retailerTenants) {
      try {
        console.log('🔍 Fetching wholesaler for tenant:', tenantId)
        const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data();
          const wholesaler = {
            id: tenantId,
            name: tenantData.name || 'Unknown Wholesaler',
            email: tenantData.email || '',
          };
          console.log('✅ Found wholesaler:', wholesaler)
          wholesalers.push(wholesaler);
        } else {
          console.log('⚠️ No tenant document found for tenant:', tenantId)
        }
      } catch (error) {
        console.error('❌ Error fetching wholesaler:', tenantId, error);
      }
    }

    console.log('📊 Step 5: Final wholesalers list:', wholesalers)

    return NextResponse.json({
      success: true,
      data: {
        wholesalers: wholesalers.map(w => ({
          id: w.id,
          name: w.name,
          email: w.email,
        })),
      },
    });

  } catch (error) {
    console.error('❌ Error fetching wholesalers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wholesalers' },
      { status: 500 }
    );
  }
}