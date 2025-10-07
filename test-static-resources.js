// 测试静态资源MIME类型修复
async function testStaticResources() {
  console.log('🧪 测试静态资源MIME类型修复...\n');

  const baseUrl = 'http://localhost:3000';
  
  // 测试关键静态资源
  const testUrls = [
    '/_next/static/chunks/main-app.js',
    '/_next/static/chunks/webpack.js',
    '/_next/static/chunks/polyfills.js',
    '/_next/static/css/app/layout.css',
    '/favicon.ico',
    '/manifest.json'
  ];

  let allPassed = true;

  for (const url of testUrls) {
    try {
      console.log(`📡 测试: ${url}`);
      
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        }
      });

      console.log(`  状态码: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type') || '未设置'}`);
      console.log(`  Cache-Control: ${response.headers.get('cache-control') || '未设置'}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const expectedType = url.endsWith('.js') ? 'application/javascript' : 
                           url.endsWith('.css') ? 'text/css' : 
                           url.endsWith('.json') ? 'application/json' : 
                           url.endsWith('.ico') ? 'image/x-icon' : null;
        
        if (expectedType && contentType && contentType.includes(expectedType)) {
          console.log(`  ✅ MIME类型正确: ${expectedType}`);
        } else if (expectedType) {
          console.log(`  ⚠️ MIME类型不匹配: 期望 ${expectedType}, 实际 ${contentType}`);
          allPassed = false;
        } else {
          console.log(`  ✅ 响应正常`);
        }

        // 检查内容是否为HTML（表示MIME类型错误）
        const text = await response.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          console.log(`  ❌ 错误: 返回HTML而不是${expectedType || '期望内容'}`);
          allPassed = false;
        } else {
          console.log(`  ✅ 内容类型正确`);
        }
      } else {
        console.log(`  ❌ 请求失败: ${response.status} ${response.statusText}`);
        allPassed = false;
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ 请求错误: ${error.message}\n`);
      allPassed = false;
    }
  }

  console.log('🎯 测试完成！');
  if (allPassed) {
    console.log('✅ 所有静态资源MIME类型正常！');
  } else {
    console.log('❌ 部分静态资源存在问题');
  }
}

// 运行测试
testStaticResources();