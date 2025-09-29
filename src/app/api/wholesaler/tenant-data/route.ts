import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Fetch tenant data
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);

    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantData = tenantDoc.data();

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantDoc.id,
        name: tenantData.name,
        address: tenantData.address,
        gstNumber: tenantData.gstNumber,
        ownerName: tenantData.ownerName,
        contactEmail: tenantData.contactEmail,
        contactPhone: tenantData.contactPhone,
        status: tenantData.status,
        createdAt: tenantData.createdAt,
        updatedAt: tenantData.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching tenant data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}