// Simple server access test
const http = require('http');

// Test different ways to access the server
const tests = [
  { url: 'http://localhost:3000', name: 'localhost' },
  { url: 'http://127.0.0.1:3000', name: '127.0.0.1' },
  { url: 'http://0.0.0.0:3000', name: '0.0.0.0' }
];

console.log('Testing server access...\n');

tests.forEach(test => {
  const req = http.get(test.url, (res) => {
    console.log(`✅ ${test.name}: ${res.statusCode} ${res.statusMessage}`);
    res.on('data', () => {}); // Consume response data
    res.on('end', () => {});
  });
  
  req.on('error', (err) => {
    console.log(`❌ ${test.name}: ${err.message}`);
  });
  
  req.setTimeout(5000, () => {
    console.log(`⏰ ${test.name}: Timeout`);
    req.destroy();
  });
});

// Test CORS headers
console.log('\nTesting CORS headers...\n');

const corsTest = http.get('http://localhost:3000', (res) => {
  console.log('Response headers:');
  Object.entries(res.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  res.on('data', () => {});
  res.on('end', () => {});
});

corsTest.on('error', (err) => {
  console.log('CORS test failed:', err.message);
});

corsTest.setTimeout(5000, () => {
  console.log('CORS test timeout');
  corsTest.destroy();
});