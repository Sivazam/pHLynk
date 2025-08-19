import { NextRequest, NextResponse } from 'next/server';
import { retailerService, invoiceService, paymentService } from '@/services/firestore';

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

    // Get invoices and payments
    const invoices = await invoiceService.getInvoicesByRetailer(tenantId, retailerId);
    const payments = await paymentService.getPaymentsByRetailer(tenantId, retailerId);

    // Calculate totals
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaidAmount = payments.filter(p => p.state === 'COMPLETED')
                                 .reduce((sum, p) => sum + p.totalPaid, 0);
    const currentOutstanding = totalInvoiceAmount - totalPaidAmount;

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
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        status: inv.status,
        issueDate: inv.issueDate
      })),
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