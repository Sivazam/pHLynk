/**
 * Test script to verify frontend cloud function calling mechanism
 * This tests the callFirebaseFunction function directly
 */

// Import the callFirebaseFunction (we'll simulate it)
const callFirebaseFunction = async function(functionName, data, retries = 2) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 Calling Firebase Function via HTTP: ${functionName} (attempt ${attempt + 1}/${retries + 1})`);
      console.log(`📤 Function data:`, JSON.stringify(data, null, 2));
      
      // Get the Firebase project ID from the config
      const firebaseConfig = {
        projectId: "pharmalynkk"
      };
      
      // Construct the function URL
      const functionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;
      
      // Firebase Functions expect the data to be sent directly for HTTP calls
      // For callable functions, we need to structure the data as { data: {...} }
      let requestData = data;
      
      // Check if this is already in callable function format (has 'data' property)
      if (data && typeof data === 'object' && data.data && typeof data.data === 'object') {
        console.log(`🔧 Data already has 'data' property, using as-is for callable function`);
        requestData = data;  // Keep the original structure with 'data' property
      } else {
        console.log(`🔧 Wrapping data in 'data' property for callable function format`);
        requestData = { data: data };  // Wrap in data property for callable functions
      }
      
      console.log(`🔧 Data processing for HTTP call:`);
      console.log(`📥 Original data structure:`, JSON.stringify(data, null, 2));
      console.log(`📤 Processed request data:`, JSON.stringify(requestData, null, 2));
      console.log(`🚨 CRITICAL DEBUG - Final HTTP request body:`, JSON.stringify(requestData, null, 2));
      
      console.log(`📤 Making HTTP request to: ${functionUrl}`);
      
      // Make the HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📤 Response status:`, response.status);
      console.log(`📤 Response status text:`, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error! status: ${response.status}, response:`, errorText);
        
        // Try to parse error as JSON for more details
        let errorDetails = null;
        try {
          errorDetails = JSON.parse(errorText);
          console.error(`❌ Parsed error details:`, errorDetails);
        } catch (parseError) {
          console.error(`❌ Could not parse error as JSON:`, errorText);
        }
        
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ Firebase Function ${functionName} called successfully:`, result);
      
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Error calling Firebase Function ${functionName} (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  console.error(`❌ All ${retries + 1} attempts failed for Firebase Function ${functionName}`);
  console.error(`❌ Final error details:`, {
    message: lastError instanceof Error ? lastError.message : 'Unknown error',
    stack: lastError instanceof Error ? lastError.stack : undefined,
    code: lastError && typeof lastError === 'object' && 'code' in lastError ? lastError.code : undefined
  });
  
  throw lastError;
};

// Test data - simulate what the frontend would send
const testRetailerData = {
  retailerId: "test-retailer-001",
  paymentId: "test-payment-001", 
  amount: 1500,
  lineWorkerName: "Test Line Worker",
  retailerName: "Test Medical Store",
  retailerArea: "Test Area",
  wholesalerName: "Test Wholesaler",
  collectionDate: "20-06-2025"
};

async function testFrontendCalls() {
  console.log('🚀 Testing Frontend Cloud Function Calling Mechanism...\n');
  
  try {
    console.log('📱 Testing sendRetailerPaymentSMS...');
    const retailerResult = await callFirebaseFunction('sendRetailerPaymentSMS', testRetailerData);
    console.log('✅ Retailer SMS function result:', retailerResult);
  } catch (error) {
    console.error('❌ Retailer SMS function failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    console.log('🏢 Testing sendWholesalerPaymentSMS...');
    const wholesalerResult = await callFirebaseFunction('sendWholesalerPaymentSMS', testRetailerData);
    console.log('✅ Wholesaler SMS function result:', wholesalerResult);
  } catch (error) {
    console.error('❌ Wholesaler SMS function failed:', error.message);
  }
}

// Run the test
testFrontendCalls().catch(console.error);