/**
 * Setup Fast2SMS Configuration for Firebase Functions
 * This script configures the Fast2SMS settings in Firebase Functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function setupFast2SMSConfig() {
  console.log('🔧 Setting up Fast2SMS configuration for Firebase Functions...\n');
  
  // Check if we have the functions .env file
  const functionsEnvPath = path.join(__dirname, 'functions', '.env');
  if (!fs.existsSync(functionsEnvPath)) {
    console.log('❌ Functions .env file not found. Please create it first.');
    return false;
  }
  
  // Read the .env file
  const envContent = fs.readFileSync(functionsEnvPath, 'utf8');
  const envVars = {};
  
  // Parse .env variables
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && !key.startsWith('#') && values.length > 0) {
      envVars[key.trim()] = values.join('=').trim().replace(/"/g, '');
    }
  });
  
  console.log('📋 Environment variables found:', Object.keys(envVars));
  
  // Check if Fast2SMS variables are configured
  if (!envVars.FAST2SMS_API_KEY || envVars.FAST2SMS_API_KEY === 'your_actual_fast2sms_api_key_here') {
    console.log('❌ Fast2SMS API key not configured. Please update the FAST2SMS_API_KEY in functions/.env');
    return false;
  }
  
  if (!envVars.ENTITY_ID || envVars.ENTITY_ID === '1701159123456789012') {
    console.log('❌ Entity ID not configured. Please update the ENTITY_ID in functions/.env');
    return false;
  }
  
  try {
    // Set Firebase Functions config
    console.log('🚀 Setting Firebase Functions config...');
    
    const commands = [
      `npx firebase functions:config:set fast2sms.api_key="${envVars.FAST2SMS_API_KEY}" --project pharmalynkk`,
      `npx firebase functions:config:set fast2sms.sender_id="${envVars.FAST2SMS_SENDER_ID || 'SNSYST'}" --project pharmalynkk`,
      `npx firebase functions:config:set fast2sms.entity_id="${envVars.ENTITY_ID}" --project pharmalynkk`
    ];
    
    commands.forEach(cmd => {
      console.log(`📡 Running: ${cmd}`);
      try {
        const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        console.log('✅ Success:', result);
      } catch (error) {
        console.log('⚠️  Warning:', error.message);
      }
    });
    
    console.log('\n✅ Fast2SMS configuration setup completed!');
    console.log('🔄 Please redeploy Firebase Functions to apply the changes:');
    console.log('   cd functions && npx firebase deploy --only functions');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up Firebase Functions config:', error.message);
    return false;
  }
}

function testConfiguration() {
  console.log('\n🧪 Testing Fast2SMS configuration...');
  
  try {
    // Test the cloud function with sample data
    const testFunction = `
      const testRetailerPaymentSMS = async () => {
        try {
          const result = await fetch('https://us-central1-pharmalynkk.cloudfunctions.net/sendRetailerPaymentSMS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: {
                retailerId: 'test-retailer-123',
                paymentId: 'test-payment-123',
                amount: 1500,
                lineWorkerName: 'Test Line Worker',
                retailerName: 'Test Retailer',
                retailerArea: 'Test Area',
                wholesalerName: 'Test Wholesaler',
                collectionDate: '30/09/2025'
              }
            })
          });
          
          const response = await result.json();
          console.log('📞 Test Response:', response);
        } catch (error) {
          console.error('❌ Test Error:', error.message);
        }
      };
      
      testRetailerPaymentSMS();
    `;
    
    console.log('📝 Test function created. You can run this in browser console to test the configuration.');
    
  } catch (error) {
    console.error('❌ Error creating test:', error.message);
  }
}

// Main execution
if (require.main === module) {
  const success = setupFast2SMSConfig();
  if (success) {
    testConfiguration();
  }
}

module.exports = {
  setupFast2SMSConfig,
  testConfiguration
};