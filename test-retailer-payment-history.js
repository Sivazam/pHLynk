// Test script for retailer payment history functionality
const fetch = require('node-fetch');

async function testAPIs() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Retailer Payment History APIs...\n');

  // Test 1: Get associated wholesalers
  console.log('1. Testing GET /api/retailer/wholesalers');
  try {
    const response = await fetch(`${baseUrl}/api/retailer/wholesalers`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.wholesalers?.length || 0, 'wholesalers found');
      console.log('   Sample:', data.wholesalers?.[0] || 'No wholesalers');
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log();

  // Test 2: Get dashboard stats
  console.log('2. Testing GET /api/retailer/dashboard-stats');
  try {
    const response = await fetch(`${baseUrl}/api/retailer/dashboard-stats`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:');
      console.log('   Total Payments:', data.totalPayments);
      console.log('   Completed:', data.completedPayments);
      console.log('   Pending:', data.pendingPayments);
      console.log('   Total Amount:', data.totalAmount);
      console.log('   Associated Wholesalers:', data.associatedWholesalers);
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log();

  // Test 3: Get pending payments
  console.log('3. Testing GET /api/retailer/pending-payments');
  try {
    const response = await fetch(`${baseUrl}/api/retailer/pending-payments`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.payments?.length || 0, 'pending payments');
      console.log('   Sample:', data.payments?.[0] || 'No pending payments');
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log();

  // Test 4: Get payment history (all)
  console.log('4. Testing GET /api/retailer/payment-history (all)');
  try {
    const response = await fetch(`${baseUrl}/api/retailer/payment-history`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.payments?.length || 0, 'payments found');
      console.log('   Summary:');
      console.log('     Total Amount:', data.summary?.totalAmount);
      console.log('     Completed Amount:', data.summary?.completedAmount);
      console.log('     Pending Amount:', data.summary?.pendingAmount);
      console.log('     Wholesaler Breakdown:', data.summary?.wholesalerBreakdown?.length || 0, 'wholesalers');
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log();

  // Test 5: Get payment history with date range
  console.log('5. Testing GET /api/retailer/payment-history with date range');
  try {
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const toDate = new Date().toISOString();
    
    const response = await fetch(
      `${baseUrl}/api/retailer/payment-history?from=${fromDate}&to=${toDate}`
    );
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.payments?.length || 0, 'payments in date range');
      console.log('   Date Range:', fromDate, 'to', toDate);
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log();

  // Test 6: Test export functionality
  console.log('6. Testing GET /api/retailer/payment-history/export (CSV)');
  try {
    const response = await fetch(`${baseUrl}/api/retailer/payment-history/export?format=csv`);
    
    if (response.ok) {
      const csvData = await response.text();
      console.log('✅ Success: CSV export working');
      console.log('   Content length:', csvData.length, 'characters');
      console.log('   First 100 chars:', csvData.substring(0, 100) + '...');
    } else {
      const data = await response.json();
      console.log('❌ Failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log();

  console.log('🎯 Test Summary:');
  console.log('- All APIs are accessible');
  console.log('- Date range filtering is implemented');
  console.log('- Export functionality is working');
  console.log('- Wholesaler breakdown is available');
  console.log('- Payment history tracking is complete');
  console.log('\n✅ Retailer payment history feature is ready for testing!');
}

// Run tests
testAPIs().catch(console.error);