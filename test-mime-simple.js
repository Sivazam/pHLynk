// 简单的MIME类型测试
async function testMimeTypes() {
  console.log('🧪 测试MIME类型修复...\n');

  const testUrls = [
    '/_next/static/chunks/main-app.js',
    '/_next/static/chunks/webpack.js', 
    '/_next/static/css/app/layout.css'
  ];

  for (const url of testUrls) {
    try {
      const response = await fetch(`http://localhost:3000${url}`);
      const contentType = response.headers.get('content-type');
      
      console.log(`${url}:`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${contentType}`);
      
      // 检查是否返回了HTML而不是JS/CSS
      const text = await response.text();
      const isHtml = text.includes('<!DOCTYPE html>') || text.includes('<html');
      
      if (isHtml) {
        console.log(`  ❌ 返回HTML而不是期望的文件类型`);
      } else {
        console.log(`  ✅ 返回正确的文件类型`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ 错误: ${error.message}\n`);
    }
  }
}

testMimeTypes();