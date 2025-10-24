import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get('retailerId');

    if (!retailerId) {
      return NextResponse.json({ error: 'Retailer ID is required' }, { status: 400 });
    }

    // Fetch payments from Firebase to get unique tenantIds
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailerId));
    const paymentSnapshot = await getDocs(paymentsQuery);
    
    const payments = paymentSnapshot.docs.map(doc => doc.data() as any);
    
    // Get unique tenantIds from payments
    const uniqueTenantIds = [...new Set(payments
      .map(p => p.tenantId)
      .filter(Boolean)
    )];

    if (uniqueTenantIds.length === 0) {
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
        const userDoc = await getDoc(doc(db, 'users', tenantId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          wholesalers.push({
            id: tenantId,
            name: userData.displayName || userData.name || 'Unknown Wholesaler',
            email: userData.email || '',
          });
        }
      } catch (error) {
        console.error('Error fetching wholesaler:', tenantId, error);
      }
    }

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
    console.error('Error fetching wholesalers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wholesalers' },
      { status: 500 }
    );
  }
}