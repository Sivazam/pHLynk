// 最终MIME类型验证
async function finalMimeVerification() {
  console.log('🎯 最终MIME类型验证...\n');

  const testUrls = [
    '/_next/static/chunks/main-app.js',
    '/_next/static/chunks/webpack.js', 
    '/_next/static/css/app/layout.css',
    '/favicon.ico'
  ];

  let allCorrect = true;

  for (const url of testUrls) {
    try {
      const response = await fetch(`http://localhost:3000${url}`);
      const contentType = response.headers.get('content-type');
      
      console.log(`${url}:`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${contentType}`);
      
      // 检查状态码
      if (!response.ok) {
        console.log(`  ❌ HTTP错误: ${response.status}`);
        allCorrect = false;
        continue;
      }
      
      // 检查Content-Type
      const expectedType = url.endsWith('.js') ? 'application/javascript' : 
                         url.endsWith('.css') ? 'text/css' : 
                         url.endsWith('.ico') ? 'image/x-icon' : null;
      
      if (expectedType && contentType && contentType.includes(expectedType)) {
        console.log(`  ✅ MIME类型正确`);
      } else if (expectedType) {
        console.log(`  ⚠️ MIME类型: 期望 ${expectedType}, 实际 ${contentType}`);
        allCorrect = false;
      } else {
        console.log(`  ✅ MIME类型可接受`);
      }
      
      // 检查是否真的是HTML错误页面
      const text = await response.text();
      const isHtmlError = text.includes('<!DOCTYPE html>') && text.includes('<html');
      
      if (isHtmlError) {
        console.log(`  ❌ 返回HTML错误页面`);
        allCorrect = false;
      } else {
        console.log(`  ✅ 返回正确的文件内容`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ 请求错误: ${error.message}\n`);
      allCorrect = false;
    }
  }

  console.log('🎯 验证结果:');
  if (allCorrect) {
    console.log('✅ 所有静态资源MIME类型正确！');
    console.log('✅ MIME类型问题已完全解决！');
  } else {
    console.log('❌ 部分静态资源仍有问题');
  }
}

finalMimeVerification();