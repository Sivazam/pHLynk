/**
 * Get Real Payment Data for Testing
 * This script will help you get the actual data that should be sent to cloud functions
 */

// Since we can't access Firebase directly, let's create a template
// based on what the actual payment flow should send

console.log('🔍 Real Payment Data Template for Cloud Functions\n');

console.log('📋 Based on your cloud function logs, the issue is:');
console.log('❌ Test data is being sent instead of real payment data');
console.log('❌ retailerId: "retailer_123" does not exist in your database\n');

console.log('🎯 SOLUTION:');
console.log('1. Find a real payment in your Firebase Console');
console.log('2. Use the actual retailerId, lineWorkerId, etc. from that payment');
console.log('3. Test the cloud functions with real data\n');

console.log('📄 REAL DATA TEMPLATE (replace with your actual data):');
console.log(JSON.stringify({
  retailerId: "ACTUAL_RETAILER_ID_FROM_PAYMENT",
  paymentId: "ACTUAL_PAYMENT_ID", 
  amount: 1500,
  lineWorkerName: "ACTUAL_LINE_WORKER_NAME",
  retailerName: "ACTUAL_RETAILER_NAME",
  retailerArea: "ACTUAL_RETAILER_AREA",
  wholesalerName: "ACTUAL_WHOLESALER_NAME",
  collectionDate: "30/09/2025"
}, null, 2));

console.log('\n🔧 TO FIND REAL DATA:');
console.log('1. Go to Firebase Console → Firestore');
console.log('2. Look at the "payments" collection');
console.log('3. Find a recent completed payment');
console.log('4. Copy the retailerId from that payment');
console.log('5. Look up the retailer in "retailers" collection to get name/phone');
console.log('6. Look up the lineWorkerId in "users" collection to get name');
console.log('7. Look up the wholesalerId from the line worker to get wholesaler name\n');

console.log('🚀 ONCE YOU HAVE REAL DATA:');
console.log('Test the cloud functions manually with curl:');
console.log('curl -X POST https://us-central1-pharmalynkk.cloudfunctions.net/sendRetailerPaymentSMS \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"data":{"retailerId":"ACTUAL_RETAILER_ID",...}}\'\n');

console.log('💡 The cloud functions are working correctly!');
console.log('They just need real data that exists in your database.');