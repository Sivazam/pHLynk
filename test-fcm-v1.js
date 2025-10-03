#!/usr/bin/env node

/**
 * Test script to verify FCM v1 configuration with service account
 */

require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000';

console.log('🧪 Testing FCM v1 Configuration with Service Account...\n');

async function checkConfiguration() {
  console.log('🔧 Checking FCM v1 Configuration...');
  
  try {
    const response = await fetch(`${API_BASE}/api/fcm/send-test-v1`, {
      method: 'GET'
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ FCM v1 Configuration Check:');
      console.log('   - Configured:', result.configured);
      console.log('   - API Version:', result.apiVersion);
      console.log('   - Project ID:', result.projectId);
      console.log('   - Client Email:', result.clientEmail);
      console.log('   - Has Private Key:', result.hasPrivateKey);
      
      if (!result.configured) {
        console.log('❌ Missing Variables:', result.missing.join(', '));
        return false;
      }
      return true;
    } else {
      console.log('❌ Configuration Check Failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Configuration Check Error:', error.message);
    return false;
  }
}

async function testFCMv1API() {
  console.log('\n📡 Testing FCM v1 API Endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/api/fcm/send-test-v1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-for-validation',
        title: '🧪 FCM v1 Configuration Test',
        body: 'Testing FCM v1 API with service account',
        data: {
          type: 'test',
          timestamp: Date.now().toString(),
          testId: 'fcm-v1-test',
          apiVersion: 'v1'
        },
        priority: 'high',
        requireInteraction: true
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ FCM v1 API: Success');
      console.log('📝 Response:', JSON.stringify(result, null, 2));
      return true;
    } else {
      console.log('❌ FCM v1 API: Error');
      console.log('📝 Error:', result);
      
      if (result.error?.includes('not configured')) {
        console.log('🔧 Fix: Check environment variables for FCM v1 service');
      }
      return false;
    }
  } catch (error) {
    console.log('❌ FCM v1 API: Network error');
    console.log('📝 Error:', error.message);
    return false;
  }
}

async function testServiceAccountAuth() {
  console.log('\n🔐 Testing Service Account Authentication...');
  
  try {
    // Test if we can create a JWT token
    const { JWT } = await import('google-auth-library');
    
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!clientEmail || !privateKey) {
      console.log('❌ Missing service account credentials');
      return false;
    }
    
    const jwt = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const tokens = await jwt.authorize();
    
    if (tokens.access_token) {
      console.log('✅ Service Account Auth: Working');
      console.log('   - Access Token Length:', tokens.access_token.length);
      console.log('   - Token Type:', tokens.token_type);
      console.log('   - Expires In:', tokens.expires_in);
      return true;
    } else {
      console.log('❌ Service Account Auth: No access token received');
      return false;
    }
  } catch (error) {
    console.log('❌ Service Account Auth Error:', error.message);
    return false;
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
  console.log('🎯 FCM v1 Service Account Test\n');
  
  // Check if dev server is running
  const serverRunning = await checkDevServer();
  
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed without development server');
    process.exit(1);
  }
  
  // Run tests
  const configOk = await checkConfiguration();
  const authOk = await testServiceAccountAuth();
  const apiOk = await testFCMv1API();
  
  console.log('\n🎉 FCM v1 Testing Complete!');
  
  console.log('\n📊 Test Results:');
  console.log(`   - Configuration: ${configOk ? '✅' : '❌'}`);
  console.log(`   - Service Auth: ${authOk ? '✅' : '❌'}`);
  console.log(`   - API Endpoint: ${apiOk ? '✅' : '❌'}`);
  
  if (configOk && authOk) {
    console.log('\n🚀 FCM v1 is ready for production use!');
    console.log('\n📝 Next Steps:');
    console.log('1. Test with real FCM tokens from the browser');
    console.log('2. Update notification services to use FCM v1');
    console.log('3. Deploy with confidence using the modern API');
  } else {
    console.log('\n🔧 Issues to resolve:');
    if (!configOk) console.log('- Fix environment configuration');
    if (!authOk) console.log('- Check service account credentials');
    if (!apiOk) console.log('- Debug API endpoint issues');
  }
}

main().catch(console.error);