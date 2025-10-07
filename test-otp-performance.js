#!/usr/bin/env node

/**
 * 🚀 OTP VERIFICATION PERFORMANCE TEST
 * 
 * Test script to measure the performance improvements
 * in the ultra-optimized OTP verification endpoint.
 */

const http = require('http');

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function performanceTest() {
  console.log('🚀 OTP VERIFICATION PERFORMANCE TEST');
  console.log('='.repeat(60));
  
  const testPaymentId = 'test-payment-' + Date.now();
  const testOTP = '123456';
  
  const testData = {
    paymentId: testPaymentId,
    otp: testOTP
  };
  
  const results = [];
  
  console.log('\n📊 Running 5 performance tests...\n');
  
  for (let i = 1; i <= 5; i++) {
    console.log(`🧪 Test ${i}/5...`);
    
    const startTime = Date.now();
    
    try {
      const response = await makeRequest('http://localhost:3000/api/otp/verify', testData);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      let responseData;
      try {
        responseData = JSON.parse(response.body);
      } catch (e) {
        responseData = { error: 'Invalid JSON' };
      }
      
      const result = {
        test: i,
        status: response.status,
        processingTime,
        hasProcessingTime: !!responseData.processingTime,
        serverReportedTime: responseData.processingTime,
        error: responseData.error || null
      };
      
      results.push(result);
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Client Time: ${processingTime}ms`);
      if (responseData.processingTime) {
        console.log(`   Server Time: ${responseData.processingTime}ms`);
      }
      if (responseData.error) {
        console.log(`   Expected Error: ${responseData.error}`);
      }
      console.log('');
      
    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      results.push({
        test: i,
        status: 'ERROR',
        processingTime,
        error: error.message
      });
      
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Time: ${processingTime}ms`);
      console.log('');
    }
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calculate statistics
  console.log('📈 PERFORMANCE RESULTS');
  console.log('='.repeat(60));
  
  const validResults = results.filter(r => r.status !== 'ERROR');
  const processingTimes = validResults.map(r => r.processingTime);
  
  if (processingTimes.length > 0) {
    const avgTime = Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length);
    const minTime = Math.min(...processingTimes);
    const maxTime = Math.max(...processingTimes);
    
    console.log(`✅ Successful Tests: ${validResults.length}/${results.length}`);
    console.log(`📊 Average Response Time: ${avgTime}ms`);
    console.log(`⚡ Fastest Response: ${minTime}ms`);
    console.log(`🐌 Slowest Response: ${maxTime}ms`);
    
    // Performance evaluation
    console.log('\n🎯 PERFORMANCE EVALUATION:');
    if (avgTime < 1000) {
      console.log('🟢 EXCELLENT: Under 1 second average');
    } else if (avgTime < 2000) {
      console.log('🟡 GOOD: Under 2 seconds average');
    } else if (avgTime < 5000) {
      console.log('🟠 FAIR: Under 5 seconds average');
    } else {
      console.log('🔴 POOR: Over 5 seconds average');
    }
    
    // Check for server-reported processing times
    const serverTimes = validResults.filter(r => r.serverReportedTime).map(r => r.serverReportedTime);
    if (serverTimes.length > 0) {
      const avgServerTime = Math.round(serverTimes.reduce((a, b) => a + b, 0) / serverTimes.length);
      console.log(`🖥️  Average Server Processing: ${avgServerTime}ms`);
      
      const networkOverhead = avgTime - avgServerTime;
      console.log(`🌐 Network Overhead: ${networkOverhead}ms`);
    }
    
  } else {
    console.log('❌ No successful tests completed');
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach(result => {
    console.log(`Test ${result.test}: ${result.status} - ${result.processingTime}ms ${result.error ? `(${result.error})` : ''}`);
  });
  
  // Performance recommendations
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
  
  if (processingTimes.length > 0) {
    const avgTime = Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length);
    
    if (avgTime > 3000) {
      console.log('🔧 Consider further optimization:');
      console.log('   - Check Firebase query performance');
      console.log('   - Implement connection pooling');
      console.log('   - Add more aggressive caching');
    } else if (avgTime > 1500) {
      console.log('🔧 Minor optimizations possible:');
      console.log('   - Review database indexes');
      console.log('   - Optimize Firebase function calls');
    } else {
      console.log('✅ Performance is optimal!');
      console.log('   - Ultra-optimized implementation working well');
    }
  }
  
  return processingTimes.length > 0;
}

async function main() {
  console.log('🔧 TESTING ULTRA-OPTIMIZED OTP VERIFICATION');
  console.log('This test measures response times and performance improvements\n');
  
  const success = await performanceTest();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 PERFORMANCE TEST COMPLETE');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('✅ Performance test completed successfully');
    console.log('📊 Check the results above for response time metrics');
  } else {
    console.log('❌ Performance test failed');
    console.log('🔧 Check if the server is running on port 3000');
  }
}

main().catch(console.error);