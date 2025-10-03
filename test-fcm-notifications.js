#!/usr/bin/env node

/**
 * Test script to verify FCM notification functionality
 */

require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000';

console.log('🧪 Testing FCM Notification System...\n');

async function testFCMTestEndpoint() {
  console.log('📡 Testing FCM Test API Endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/api/fcm/send-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-for-validation',
        title: '🧪 FCM Configuration Test',
        body: 'Testing if FCM keys are properly configured',
        data: {
          type: 'test',
          timestamp: Date.now().toString(),
          testId: 'config-test'
        }
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ FCM Test API: Endpoint is working');
      console.log('📝 Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FCM Test API: Error response');
      console.log('📝 Error:', result);
      
      if (result.error === 'FCM server key not configured') {
        console.log('🔧 Fix: FCM_SERVER_KEY is not properly set in environment');
      }
    }
  } catch (error) {
    console.log('❌ FCM Test API: Network error');
    console.log('📝 Error:', error.message);
    console.log('💡 Make sure the development server is running on port 3000');
  }
}

async function testNotificationService() {
  console.log('\n🔔 Testing Notification Service...');
  
  try {
    const response = await fetch(`${API_BASE}/api/test-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'fcm',
        title: '🧪 Notification Service Test',
        body: 'Testing complete notification system',
        data: {
          testId: 'notification-service-test',
          timestamp: Date.now().toString()
        }
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Notification Service: Working');
      console.log('📝 Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Notification Service: Error');
      console.log('📝 Error:', result);
    }
  } catch (error) {
    console.log('❌ Notification Service: Network error');
    console.log('📝 Error:', error.message);
  }
}

async function testFCMDeviceRegistration() {
  console.log('\n📱 Testing FCM Device Registration...');
  
  try {
    const response = await fetch(`${API_BASE}/api/fcm/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        retailerId: 'test-retailer-id',
        deviceToken: 'test-device-token',
        userAgent: 'Test Script'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ FCM Registration: Endpoint working');
      console.log('📝 Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FCM Registration: Error');
      console.log('📝 Error:', result);
    }
  } catch (error) {
    console.log('❌ FCM Registration: Network error');
    console.log('📝 Error:', error.message);
  }
}

async function checkDevServer() {
  console.log('🖥️  Checking Development Server...');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    if (response.ok) {
      console.log('✅ Development Server: Running');
      return true;
    } else {
      console.log('⚠️  Development Server: Running but health check failed');
      return true;
    }
  } catch (error) {
    console.log('❌ Development Server: Not running');
    console.log('💡 Please start the development server with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🎯 FCM Notification System Test\n');
  
  // Check if dev server is running
  const serverRunning = await checkDevServer();
  
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed without development server');
    process.exit(1);
  }
  
  // Run tests
  await testFCMTestEndpoint();
  await testFCMDeviceRegistration();
  await testNotificationService();
  
  console.log('\n🎉 FCM Notification Testing Complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Open http://localhost:3000/test-notifications in your browser');
  console.log('2. Grant notification permissions when prompted');
  console.log('3. Test the notification functionality from the UI');
  console.log('4. Check browser console for detailed logs');
}

main().catch(console.error);