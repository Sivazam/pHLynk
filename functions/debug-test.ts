// Simple debug function to test HTTP functionality
export const debugTest = functions.https.onRequest(async (req, res) => {
  try {
    console.log('🚀 DEBUG TEST FUNCTION TRIGGERED');
    console.log('📥 Request method:', req.method);
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.error('❌ Invalid method:', req.method);
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    // Handle CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.status(200).json({
      success: true,
      message: 'Debug test function working correctly',
      timestamp: new Date().toISOString(),
      receivedData: req.body
    });
    
  } catch (error) {
    console.error('❌ Debug test error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});