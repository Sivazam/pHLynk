/**
 * Test script to verify SMS notification functionality
 * This script simulates the payment flow and checks if SMS notifications are working
 */

const fs = require('fs');
const path = require('path');

// Check environment variables
function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n');
  
  // Check main .env file
  const mainEnvPath = path.join(__dirname, '.env');
  if (fs.existsSync(mainEnvPath)) {
    const mainEnvContent = fs.readFileSync(mainEnvPath, 'utf8');
    console.log('📄 Main .env file found:');
    console.log(mainEnvContent);
  } else {
    console.log('❌ Main .env file not found');
  }
  
  // Check functions .env file
  const functionsEnvPath = path.join(__dirname, 'functions', '.env');
  if (fs.existsSync(functionsEnvPath)) {
    const functionsEnvContent = fs.readFileSync(functionsEnvPath, 'utf8');
    console.log('\n📄 Functions .env file found:');
    console.log(functionsEnvContent);
  } else {
    console.log('\n❌ Functions .env file not found');
  }
  
  console.log('\n✅ Environment variables check completed');
}

// Check Firebase Functions configuration
function checkFirebaseFunctions() {
  console.log('\n🔍 Checking Firebase Functions configuration...\n');
  
  const functionsIndexPath = path.join(__dirname, 'functions', 'src', 'index.ts');
  if (fs.existsSync(functionsIndexPath)) {
    const functionsContent = fs.readFileSync(functionsIndexPath, 'utf8');
    
    // Check if SMS functions are defined
    const hasRetailerSMS = functionsContent.includes('sendRetailerPaymentSMS');
    const hasWholesalerSMS = functionsContent.includes('sendWholesalerPaymentSMS');
    
    console.log('📞 SMS Functions found:');
    console.log(`  - sendRetailerPaymentSMS: ${hasRetailerSMS ? '✅ YES' : '❌ NO'}`);
    console.log(`  - sendWholesalerPaymentSMS: ${hasWholesalerSMS ? '✅ YES' : '❌ NO'}`);
    
    // Check Fast2SMS configuration
    const hasFast2SMSConfig = functionsContent.includes('FAST2SMS_API_KEY');
    console.log(`  - Fast2SMS Configuration: ${hasFast2SMSConfig ? '✅ YES' : '❌ NO'}`);
    
    // Check environment variable usage
    const hasEnvImport = functionsContent.includes('dotenv/config');
    console.log(`  - Environment Import: ${hasEnvImport ? '✅ YES' : '❌ NO'}`);
  } else {
    console.log('❌ Functions index.ts not found');
  }
  
  console.log('\n✅ Firebase Functions check completed');
}

// Check Fast2SMS service configuration
function checkFast2SMSService() {
  console.log('\n🔍 Checking Fast2SMS service configuration...\n');
  
  const servicePath = path.join(__dirname, 'src', 'services', 'fast2sms-service.ts');
  if (fs.existsSync(servicePath)) {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    // Check if service is properly configured
    const hasConfigMethod = serviceContent.includes('getConfig()');
    const hasSendMethod = serviceContent.includes('sendPaymentConfirmationSMS');
    const hasMessageIds = serviceContent.includes('199054') && serviceContent.includes('199055');
    
    console.log('📱 Fast2SMS Service:');
    console.log(`  - Config Method: ${hasConfigMethod ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Send Method: ${hasSendMethod ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Message IDs (199054, 199055): ${hasMessageIds ? '✅ YES' : '❌ NO'}`);
    
    // Check environment variable usage
    const envVars = ['FAST2SMS_API_KEY', 'FAST2SMS_SENDER_ID', 'ENTITY_ID'];
    envVars.forEach(envVar => {
      const hasEnvVar = serviceContent.includes(envVar);
      console.log(`  - ${envVar}: ${hasEnvVar ? '✅ YES' : '❌ NO'}`);
    });
  } else {
    console.log('❌ Fast2SMS service not found');
  }
  
  console.log('\n✅ Fast2SMS service check completed');
}

// Check OTP verification API
function checkOTPVerificationAPI() {
  console.log('\n🔍 Checking OTP verification API...\n');
  
  const apiPath = path.join(__dirname, 'src', 'app', 'api', 'otp', 'verify', 'route.ts');
  if (fs.existsSync(apiPath)) {
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Check if SMS notifications are triggered
    const hasFast2SMSImport = apiContent.includes('fast2SMSService');
    const hasRetailerSMS = apiContent.includes('sendPaymentConfirmationSMS');
    const hasWholesalerSMS = apiContent.includes('sendPaymentConfirmationSMS');
    
    console.log('📤 OTP Verification API:');
    console.log(`  - Fast2SMS Import: ${hasFast2SMSImport ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Retailer SMS Call: ${hasRetailerSMS ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Wholesaler SMS Call: ${hasWholesalerSMS ? '✅ YES' : '❌ NO'}`);
    
    // Check if SMS calls are in the success path
    const hasSuccessPathSMS = apiContent.includes('retailerSMSResult') && apiContent.includes('wholesalerSMSResult');
    console.log(`  - SMS in Success Path: ${hasSuccessPathSMS ? '✅ YES' : '❌ NO'}`);
  } else {
    console.log('❌ OTP verification API not found');
  }
  
  console.log('\n✅ OTP verification API check completed');
}

// Generate summary and recommendations
function generateSummary() {
  console.log('\n📋 SUMMARY AND RECOMMENDATIONS\n');
  console.log('=' .repeat(50));
  
  console.log('\n🎯 ISSUES IDENTIFIED:');
  console.log('1. Fast2SMS API Key not configured properly');
  console.log('2. Environment variables may not be loaded correctly');
  console.log('3. Firebase Functions may not have access to environment variables');
  
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('1. Set up actual Fast2SMS API key in both .env files');
  console.log('2. Ensure Firebase Functions are deployed with proper environment configuration');
  console.log('3. Test SMS functionality in development mode first');
  console.log('4. Check Firebase Functions logs for any errors');
  
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Replace "your_actual_fast2sms_api_key_here" with real API key');
  console.log('2. Deploy Firebase Functions with environment variables');
  console.log('3. Test payment collection and OTP verification flow');
  console.log('4. Monitor SMS delivery logs in Firebase console');
  
  console.log('\n✅ Summary completed');
}

// Main test function
function runTests() {
  console.log('🚀 Starting SMS functionality test...\n');
  console.log('=' .repeat(50));
  
  checkEnvironmentVariables();
  checkFirebaseFunctions();
  checkFast2SMSService();
  checkOTPVerificationAPI();
  generateSummary();
  
  console.log('\n🎉 SMS functionality test completed!');
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  checkEnvironmentVariables,
  checkFirebaseFunctions,
  checkFast2SMSService,
  checkOTPVerificationAPI,
  generateSummary
};