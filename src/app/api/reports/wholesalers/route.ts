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

    // Fetch payments from Firebase to get unique tenantIds
    console.log('🔍 Fetching payments for retailer:', retailerId)
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailerId));
    const paymentSnapshot = await getDocs(paymentsQuery);
    
    const payments = paymentSnapshot.docs.map(doc => doc.data() as any);
    console.log('💳 Found payments:', payments.length)
    
    // Get unique tenantIds from payments
    const uniqueTenantIds = [...new Set(payments
      .map(p => p.tenantId)
      .filter(Boolean)
    )];

    console.log('🏢 Unique tenant IDs:', uniqueTenantIds)

    if (uniqueTenantIds.length === 0) {
      console.log('⚠️ No tenant IDs found in payments')
      return NextResponse.json({
        success: true,
        data: {
          wholesalers: [],
        },
      });
    }

    // Fetch wholesaler details from users collection
    const wholesalers: any[] = [];
    for (const tenantId of uniqueTenantIds) {
      try {
        console.log('🔍 Fetching wholesaler for tenant:', tenantId)
        const userDoc = await getDoc(doc(db, 'users', tenantId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const wholesaler = {
            id: tenantId,
            name: userData.displayName || userData.name || 'Unknown Wholesaler',
            email: userData.email || '',
          };
          console.log('✅ Found wholesaler:', wholesaler)
          wholesalers.push(wholesaler);
        } else {
          console.log('⚠️ No user document found for tenant:', tenantId)
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