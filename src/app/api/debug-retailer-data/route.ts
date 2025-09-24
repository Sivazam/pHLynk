import { NextRequest, NextResponse } from 'next/server';
import { retailerService, paymentService } from '@/services/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get('retailerId');
    const tenantId = searchParams.get('tenantId');

    if (!retailerId || !tenantId) {
      return NextResponse.json({ error: 'Missing retailerId or tenantId' }, { status: 400 });
    }

    console.log(`🔍 Debugging retailer data for retailer ${retailerId}`);

    // Get retailer data
    const retailer = await retailerService.getById(retailerId, tenantId);
    if (!retailer) {
      return NextResponse.json({ error: 'Retailer not found' }, { status: 404 });
    }

    // Get payments only (invoices removed)
    const payments = await paymentService.getPaymentsByRetailer(tenantId, retailerId);

    // Calculate totals - only payments matter now
    const totalPaidAmount = payments.filter(p => p.state === 'COMPLETED')
                                 .reduce((sum, p) => sum + p.totalPaid, 0);
    
    // Since we don't have invoices anymore, outstanding is always 0
    const currentOutstanding = 0;
    const totalInvoiceAmount = 0;

    const debugData = {
      retailer: {
        id: retailer.id,
        name: retailer.name,
        currentOutstanding: retailer.currentOutstanding,
        totalInvoiceAmount: retailer.totalInvoiceAmount,
        totalPaidAmount: retailer.totalPaidAmount,
        computedAt: retailer.computedAt
      },
      calculated: {
        totalInvoiceAmount,
        totalPaidAmount,
        currentOutstanding
      },
      invoices: [], // No invoices anymore
      payments: payments.map(p => ({
        id: p.id,
        totalPaid: p.totalPaid,
        state: p.state,
        method: p.method,
        createdAt: p.createdAt,
        timeline: p.timeline
      }))
    };

    console.log(`📊 Debug data for retailer ${retailerId}:`, debugData);

    return NextResponse.json(debugData);
  } catch (error) {
    console.error('❌ Error debugging retailer data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}