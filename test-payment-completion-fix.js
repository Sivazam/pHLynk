// 测试支付完成通知修复
// 这个脚本验证我们是否正确使用了专门的 sendPaymentCompletionNotification 云函数

async function testPaymentCompletionFix() {
  console.log('🧪 测试支付完成通知修复...\n');

  try {
    // 测试数据
    const testData = {
      retailerId: 'test-retailer-123',
      amount: 1500,
      paymentId: 'test-payment-' + Date.now(),
      retailerName: 'Test Retailer',
      lineWorkerName: 'Test Line Worker',
      wholesalerId: 'test-wholesaler-456'
    };

    console.log('📤 测试数据:', JSON.stringify(testData, null, 2));

    // 调用修复后的支付完成通知 API
    const response = await fetch('http://localhost:3000/api/fcm/send-payment-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\n📥 API 响应状态:', response.status);
    console.log('📥 API 响应数据:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ 测试成功！支付完成通知修复正常工作');
      console.log('📊 结果摘要:');
      result.results.forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.type}: ${res.success ? '✅ 成功' : '❌ 失败'}`);
        if (res.error) console.log(`     错误: ${res.error}`);
      });
    } else {
      console.log('\n❌ 测试失败:', result.error || '未知错误');
    }

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testPaymentCompletionFix();