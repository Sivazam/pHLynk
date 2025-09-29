import { NextRequest, NextResponse } from 'next/server';
import { getFunctionsConfig, isFast2SMSConfigured, getFast2SMSConfig } from '@/lib/functions-config';

export async function GET(request: NextRequest) {
  try {
    const config = getFunctionsConfig();
    const isConfigured = isFast2SMSConfigured();
    const fast2smsConfig = getFast2SMSConfig();

    // Check environment variables
    const envVars = {
      fast2sms_api_key: process.env.fast2sms_api_key ? '***SET***' : 'NOT SET',
      FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY ? '***SET***' : 'NOT SET',
      fast2sms_sender_id: process.env.fast2sms_sender_id || 'NOT SET',
      FAST2SMS_SENDER_ID: process.env.FAST2SMS_SENDER_ID || 'NOT SET',
      fast2sms_entity_id: process.env.fast2sms_entity_id || 'NOT SET',
      ENTITY_ID: process.env.ENTITY_ID || 'NOT SET',
      entityid: process.env.entityid || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    };

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      functionsConfig: config,
      fast2smsConfig: {
        apiKey: fast2smsConfig.apiKey ? '***PRESENT***' : 'NOT SET',
        senderId: fast2smsConfig.senderId,
        entityId: fast2smsConfig.entityId
      },
      environmentVariables: envVars,
      message: isConfigured 
        ? 'Fast2SMS is properly configured' 
        : 'Fast2SMS is not configured - please check environment variables'
    });

  } catch (error) {
    console.error('Error in Fast2SMS debug endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check Fast2SMS configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}