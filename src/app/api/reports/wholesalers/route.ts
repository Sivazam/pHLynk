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
    console.log('📧 User email from session:', session.user.email)

    if (!retailerId) {
      return NextResponse.json({ error: 'Retailer ID is required' }, { status: 400 });
    }

    // First, get the retailer document to find their tenantIds
    console.log('🔍 Fetching retailer document for:', retailerId)
    const retailersRef = collection(db, 'retailers');
    const retailerQuery = query(retailersRef, where('phone', '==', session.user.email || ''));
    const retailerSnapshot = await getDocs(retailerQuery);
    
    if (retailerSnapshot.empty) {
      console.log('❌ No retailer found for email:', session.user.email)
      return NextResponse.json({
        success: true,
        data: {
          wholesalers: [],
        },
      });
    }

    const retailerDoc = retailerSnapshot.docs[0];
    const retailerData = retailerDoc.data();
    console.log('🏪 Retailer data found:', {
      name: retailerData.name,
      tenantIds: retailerData.tenantIds,
      phone: retailerData.phone
    })

    // Get tenantIds from retailer document
    const retailerTenants = retailerData.tenantIds || [];
    console.log('🏢 Available tenant IDs:', retailerTenants)

    if (retailerTenants.length === 0) {
      console.log('⚠️ No tenant IDs found for retailer')
      return NextResponse.json({
        success: true,
        data: {
          wholesalers: [],
        },
      });
    }

    // Fetch wholesaler details from tenants collection (same as dashboard)
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

    console.log('📊 Final wholesalers list:', wholesalers)

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