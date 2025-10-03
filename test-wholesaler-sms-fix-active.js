#!/usr/bin/env node

/**
 * 🔧 WHOLESALER SMS FIX VERIFICATION
 * 
 * Test script to verify the wholesaler SMS fix is working
 * without requiring Firebase authentication.
 */

const http = require('http');
const https = require('https');

function makeRequest(url, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testWholesalerSMSFix() {
  console.log('🧪 TESTING WHOLESALER SMS FIX');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Check if the API endpoint is accessible
    console.log('\n📋 Test 1: Checking API endpoint accessibility...');
    
    try {
      const response = await makeRequest('http://localhost:3000/api/health');
      if (response.status === 200) {
        console.log('✅ API server is running and accessible');
      } else {
        console.log('⚠️ API server responded with status:', response.status);
      }
    } catch (error) {
      console.log('❌ API server not accessible:', error.message);
      console.log('   Make sure the dev server is running on port 3000');
      return false;
    }

    // Test 2: Verify the OTP verification endpoint exists
    console.log('\n📋 Test 2: Checking OTP verification endpoint...');
    
    try {
      const response = await makeRequest('http://localhost:3000/api/otp/verify', {
        paymentId: 'test-payment-id',
        otp: '123456'
      });
      
      console.log(`✅ OTP endpoint accessible (status: ${response.status})`);
      
      if (response.body) {
        try {
          const result = JSON.parse(response.body);
          if (result.error && result.error.includes('OTP not found or expired')) {
            console.log('✅ OTP endpoint working correctly (rejected invalid OTP as expected)');
          }
        } catch (parseError) {
          console.log('📄 OTP endpoint response:', response.body.substring(0, 100));
        }
      }
    } catch (error) {
      console.log('❌ OTP endpoint error:', error.message);
    }

    // Test 3: Check code structure by reading the fixed file
    console.log('\n📋 Test 3: Verifying code fixes in place...');
    
    const fs = require('fs');
    const otpVerifyFile = '/home/z/my-project/src/app/api/otp/verify/route.ts';
    
    try {
      const fileContent = fs.readFileSync(otpVerifyFile, 'utf8');
      
      // Check for the critical fixes
      const fixes = [
        { name: 'contactPhone field', pattern: /wholesalerData\.contactPhone/ },
        { name: 'tenantId usage', pattern: /lineWorkerData\.tenantId/ },
        { name: 'tenants collection', pattern: /doc\(db, 'tenants'/ },
        { name: 'no wholesalerId usage', pattern: /lineWorkerData\.wholesalerId/, negative: true }
      ];
      
      let allFixesPresent = true;
      
      for (const fix of fixes) {
        const found = fix.pattern.test(fileContent);
        const shouldFind = !fix.negative;
        
        if (shouldFind && found) {
          console.log(`✅ Fix present: ${fix.name}`);
        } else if (!shouldFind && !found) {
          console.log(`✅ Fix present: ${fix.name} (removed)`);
        } else {
          console.log(`❌ Fix missing: ${fix.name}`);
          allFixesPresent = false;
        }
      }
      
      if (allFixesPresent) {
        console.log('✅ All code fixes are in place');
      } else {
        console.log('❌ Some code fixes are missing');
        return false;
      }
      
    } catch (fileError) {
      console.log('❌ Could not read OTP verification file:', fileError.message);
      return false;
    }

    console.log('\n🎉 WHOLESALER SMS FIX VERIFICATION COMPLETE');
    console.log('✅ All fixes are in place and ready');
    console.log('✅ The wholesaler SMS should now be triggered correctly');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🔧 WHOLESALER SMS FIX VERIFICATION');
  console.log('Testing if the fixes are active...\n');
  
  const success = await testWholesalerSMSFix();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION RESULT');
  console.log('='.repeat(50));
  
  if (success) {
    console.log('✅ WHOLESALER SMS FIX: ACTIVE');
    console.log('✅ Ready for real payment testing');
    console.log('\n🚀 NEXT STEP:');
    console.log('   Test with a real payment to verify wholesaler receives SMS');
  } else {
    console.log('❌ WHOLESALER SMS FIX: INACTIVE');
    console.log('❌ Additional troubleshooting needed');
  }
}

main().catch(console.error);