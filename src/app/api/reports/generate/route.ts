import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { toDate as convertToDate } from '@/lib/timestamp-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Generate Report API called')
    
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

    const { wholesalerId, dateRange, retailerId } = await request.json();

    console.log('📊 Request params:', { wholesalerId, dateRange, retailerId })

    if (!retailerId || !dateRange) {
      console.log('❌ Missing required parameters')
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_7_days':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(startDate);
        lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
        lastMonthEnd.setDate(0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        endDate.setTime(lastMonthEnd.getTime());
        break;
      case 'last_6_months':
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_1_year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Build query
    let whereClause: any = {
      retailerId,
    };

    // Fetch payments from Firebase
    const paymentsRef = collection(db, 'payments');
    let paymentsQuery = query(paymentsRef, where('retailerId', '==', retailerId));
    
    const paymentSnapshot = await getDocs(paymentsQuery);
    let payments = paymentSnapshot.docs.map(doc => ({
      paymentId: doc.id,
      ...doc.data()
    } as any));

    // Apply wholesaler filter if provided
    if (wholesalerId && wholesalerId !== 'all') {
      payments = payments.filter(payment => payment.tenantId === wholesalerId);
    }

    // Apply date filter
    payments = payments.filter(payment => {
      if (!payment.createdAt) return false;
      const paymentDate = convertToDate(payment.createdAt);
      return paymentDate >= startDate && paymentDate <= endDate;
    });

    // Filter only completed payments
    payments = payments.filter(payment => payment.state === 'COMPLETED');

    console.log('💳 Filtered completed payments:', payments.length)

    // Fetch retailer details
    let retailerDetails: any = null;
    try {
      const retailersRef = collection(db, 'retailers');
      const retailerQuery = query(retailersRef, where('phone', '==', session.user.email || ''));
      const retailerSnapshot = await getDocs(retailerQuery);
      
      if (!retailerSnapshot.empty) {
        const retailerDoc = retailerSnapshot.docs[0];
        retailerDetails = { id: retailerDoc.id, ...retailerDoc.data() };
        console.log('🏪 Found retailer details:', retailerDetails.name)
      } else {
        console.log('⚠️ No retailer found for email:', session.user.email)
      }
    } catch (error) {
      console.error('❌ Error fetching retailer details:', error);
    }

    // Fetch wholesaler and line worker details
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        let wholesalerName = payment.initiatedByTenantName || 'Unknown Wholesaler';
        let lineWorkerName = 'Unknown Line Worker';

        try {
          // Try to get wholesaler name from users collection if tenantId exists
          if (payment.tenantId) {
            const wholesalerDoc = await getDoc(doc(db, 'users', payment.tenantId));
            if (wholesalerDoc.exists()) {
              const wholesalerData = wholesalerDoc.data();
              wholesalerName = wholesalerData.displayName || wholesalerData.name || wholesalerName;
            }
          }

          // Try to get line worker name
          if (payment.lineWorkerId) {
            const lineWorkerDoc = await getDoc(doc(db, 'users', payment.lineWorkerId));
            if (lineWorkerDoc.exists()) {
              const lineWorkerData = lineWorkerDoc.data();
              lineWorkerName = lineWorkerData.displayName || lineWorkerData.name || lineWorkerName;
            }
          }
        } catch (error) {
          console.error('Error fetching payment details:', error);
        }

        return {
          ...payment,
          wholesalerName,
          lineWorkerName,
          retailer: retailerDetails ? {
            name: retailerDetails.name || 'N/A',
            phone: retailerDetails.phone || 'N/A',
            address: retailerDetails.address || 'N/A',
          } : {
            name: 'N/A',
            phone: 'N/A',
            address: 'N/A',
          },
        };
      })
    );

    // Calculate totals
    const totalAmount = enrichedPayments.reduce((sum, payment) => sum + (payment.totalPaid || 0), 0);
    const totalPayments = enrichedPayments.length;

    // Sort payments by date (newest first)
    enrichedPayments.sort((a, b) => {
      const dateA = a.createdAt ? convertToDate(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? convertToDate(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Generate CSV data
    const csvHeaders = [
      'Payment ID',
      'Date',
      'Time',
      'Retailer Name',
      'Retailer Phone',
      'Wholesaler Name',
      'Line Worker Name',
      'Amount (₹)',
      'Payment Method',
      'Status',
      'Completed Date',
    ];

    const csvRows = enrichedPayments.map((payment) => [
      payment.paymentId,
      payment.createdAt ? convertToDate(payment.createdAt).toLocaleDateString('en-IN') : 'N/A',
      payment.createdAt ? convertToDate(payment.createdAt).toLocaleTimeString('en-IN') : 'N/A',
      payment.retailer?.name || 'N/A',
      payment.retailer?.phone || 'N/A',
      payment.wholesalerName,
      payment.lineWorkerName,
      (payment.totalPaid || 0).toFixed(2),
      payment.method || 'CASH',
      payment.state || 'COMPLETED',
      payment.updatedAt ? convertToDate(payment.updatedAt).toLocaleString('en-IN') : 'N/A',
    ]);

    // Add summary rows
    csvRows.push([]);
    csvRows.push(['SUMMARY', '', '', '', '', '', '', '', '', '', '']);
    csvRows.push(['Total Payments', totalPayments.toString(), '', '', '', '', '', '', '', '', '']);
    csvRows.push(['Total Amount', `₹${totalAmount.toFixed(2)}`, '', '', '', '', '', '', '', '', '']);
    csvRows.push(['Report Generated', new Date().toLocaleString('en-IN'), '', '', '', '', '', '', '', '', '']);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    console.log('📈 Report generated successfully:', {
      totalPayments,
      totalAmount,
      csvLength: csvContent.length
    })

    return NextResponse.json({
      success: true,
      data: {
        payments: enrichedPayments,
        summary: {
          totalAmount,
          totalPayments,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            label: dateRange,
          },
        },
        csvContent,
      },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}