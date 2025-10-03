#!/usr/bin/env node

/**
 * Test script to verify FCM configuration
 */

require('dotenv').config({ path: '.env' });

console.log('🔧 Testing FCM Configuration...\n');

// Check required environment variables
const requiredVars = [
  'FCM_SERVER_KEY',
  'FCM_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FCM_VAPID_KEY'
];

const optionalVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

let allConfigured = true;

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT CONFIGURED`);
    allConfigured = false;
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`⚠️  ${varName}: NOT CONFIGURED`);
  }
});

// Test FCM API connectivity
async function testFCMAPI() {
  console.log('\n🌐 Testing FCM API Connectivity...');
  
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.log('❌ Cannot test API: FCM_SERVER_KEY not configured');
    return;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'test-token',
        notification: {
          title: 'Test',
          body: 'Configuration Test'
        },
        dry_run: true
      })
    });

    if (response.status === 401) {
      console.log('❌ FCM API: Invalid server key');
    } else if (response.status === 400) {
      console.log('✅ FCM API: Server key is valid (invalid token expected for test)');
    } else {
      console.log(`✅ FCM API: Response ${response.status} - Server key appears valid`);
    }
  } catch (error) {
    console.log('❌ FCM API: Network error', error.message);
  }
}

// Summary
console.log('\n📊 Configuration Summary:');
if (allConfigured) {
  console.log('✅ All required FCM variables are configured');
  console.log('🚀 Ready to test FCM notifications');
} else {
  console.log('❌ Some required FCM variables are missing');
  console.log('🔧 Please configure the missing variables in .env');
}

// Test API connectivity
testFCMAPI().then(() => {
  console.log('\n🎉 FCM Configuration Test Complete');
});