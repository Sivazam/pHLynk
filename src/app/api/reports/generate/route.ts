import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { toDate as convertToDate } from '@/lib/timestamp-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Generate Report API called')

    // Get user info from query parameter or header (for testing/development)
    const searchParams = request.nextUrl.searchParams
    const userPhone = searchParams.get('phone') || request.headers.get('x-user-phone')

    // For development, if no phone provided, use the test retailer phone
    const phone = userPhone || '9014882779'

    console.log('📝 Using phone:', phone)

    if (!phone) {
      console.log('❌ No phone number provided')
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
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
      payments = payments.filter(payment =>
        (payment.tenantIds && payment.tenantIds.includes(wholesalerId)) ||
        payment.tenantId === wholesalerId
      );
      console.log(`🏢 Filtered by wholesaler ${wholesalerId}: ${payments.length} payments`);
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
      const retailerQuery = query(retailersRef, where('phone', '==', phone));
      const retailerSnapshot = await getDocs(retailerQuery);

      if (!retailerSnapshot.empty) {
        const retailerDoc = retailerSnapshot.docs[0];
        retailerDetails = { id: retailerDoc.id, ...retailerDoc.data() };
        console.log('🏪 Found retailer details:', retailerDetails.name)
      } else {
        console.log('⚠️ No retailer found for phone:', phone)
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
          // Try to get wholesaler name from tenants collection if tenantIds exists
          if (payment.tenantIds && payment.tenantIds.length > 0) {
            // Use the first tenantId from the array
            const tenantId = payment.tenantIds[0];
            console.log(`🔍 Looking for wholesaler with tenantId: ${tenantId}`);
            const wholesalerDoc = await getDoc(doc(db, 'tenants', tenantId));
            if (wholesalerDoc.exists()) {
              const wholesalerData = wholesalerDoc.data();
              wholesalerName = wholesalerData.name || wholesalerName;
              console.log(`✅ Found wholesaler name: ${wholesalerName}`);
            } else {
              console.log(`❌ No tenant found with ID: ${tenantId}`);

              // Fallback: try users collection
              const userDoc = await getDoc(doc(db, 'users', tenantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                wholesalerName = userData.displayName || userData.name || wholesalerName;
                console.log(`✅ Found wholesaler name from users: ${wholesalerName}`);
              }
            }
          } else if (payment.tenantId) {
            // Fallback for single tenantId (if exists)
            console.log(`🔍 Looking for wholesaler with single tenantId: ${payment.tenantId}`);
            const wholesalerDoc = await getDoc(doc(db, 'tenants', payment.tenantId));
            if (wholesalerDoc.exists()) {
              const wholesalerData = wholesalerDoc.data();
              wholesalerName = wholesalerData.name || wholesalerName;
              console.log(`✅ Found wholesaler name: ${wholesalerName}`);
            } else {
              console.log(`❌ No tenant found with ID: ${payment.tenantId}`);

              // Fallback: try users collection
              const userDoc = await getDoc(doc(db, 'users', payment.tenantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                wholesalerName = userData.displayName || userData.name || wholesalerName;
                console.log(`✅ Found wholesaler name from users: ${wholesalerName}`);
              }
            }
          } else {
            console.log(`❌ No tenantId or tenantIds found for payment: ${payment.paymentId}`);
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
      'Ref No / Cheque No',
      'Bank / Details',
      'Status',
      'Completed Date',
    ];

    const csvRows = enrichedPayments.map((payment) => {
      let refNo = payment.utr || '';
      let details = '';

      if (payment.method === 'CHEQUE') {
        refNo = payment.chequeNumber || '';
        if (payment.chequeDate) {
          const date = new Date(payment.chequeDate); // Assuming it's a string/timestamp compliant format or convert it
          // Note: Backend might receive Firestore Timestamp or string. 
          // `convertToDate` is imported. Let's use it if needed, but `doc.data()` usually has Timestamps.
          // convertToDate handles both.
          const d = convertToDate(payment.chequeDate);
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear().toString().slice(-2);
          details = `${payment.bankName || ''} (${day}/${month}/${year})`;
        } else {
          details = `${payment.bankName || ''}`;
        }
      } else if (payment.method === 'UPI') {
        refNo = payment.utr || '';
      }

      return [
        payment.paymentId,
        payment.createdAt ? convertToDate(payment.createdAt).toLocaleDateString('en-IN') : 'N/A',
        payment.createdAt ? convertToDate(payment.createdAt).toLocaleTimeString('en-IN') : 'N/A',
        payment.retailer?.name || 'N/A',
        payment.retailer?.phone || 'N/A',
        payment.wholesalerName,
        payment.lineWorkerName,
        (payment.totalPaid || 0).toString(),
        payment.method || 'CASH',
        refNo,
        details,
        payment.state || 'COMPLETED',
        payment.updatedAt ? convertToDate(payment.updatedAt).toLocaleString('en-IN') : 'N/A',
      ];
    });

    // Add summary rows
    csvRows.push([]);
    csvRows.push(['SUMMARY', '', '', '', '', '', '', '', '', '', '']);
    csvRows.push(['Total Payments', totalPayments.toString(), '', '', '', '', '', '', '', '', '']);
    csvRows.push(['Total Amount', totalAmount.toString(), '', '', '', '', '', '', '', '', '']);
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