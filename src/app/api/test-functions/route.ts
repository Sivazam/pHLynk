import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseFunctions } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Firebase Functions integration...');
    
    // Test Firebase Functions initialization
    const functionsInstance = await initializeFirebaseFunctions();
    console.log('📋 Functions instance:', functionsInstance ? 'AVAILABLE' : 'NOT AVAILABLE');
    
    if (!functionsInstance) {
      return NextResponse.json({
        success: false,
        message: 'Firebase Functions not available',
        environment: process.env.NODE_ENV,
        functionsEmulator: process.env.FUNCTIONS_EMULATOR
      });
    }
    
    // Try to import the functions module
    const functionsModule = await import('firebase/functions');
    console.log('📦 Functions module imported successfully');
    
    // Test creating a callable function
    try {
      const testFunction = functionsModule.httpsCallable(functionsInstance, 'sendRetailerPaymentSMS');
      console.log('✅ Successfully created callable function');
      
      return NextResponse.json({
        success: true,
        message: 'Firebase Functions integration working',
        environment: process.env.NODE_ENV,
        functionsEmulator: process.env.FUNCTIONS_EMULATOR,
        functionAvailable: true
      });
    } catch (error) {
      console.error('❌ Error creating callable function:', error);
      return NextResponse.json({
        success: false,
        message: 'Error creating callable function',
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.NODE_ENV,
        functionsEmulator: process.env.FUNCTIONS_EMULATOR
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing Firebase Functions:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing Firebase Functions',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      functionsEmulator: process.env.FUNCTIONS_EMULATOR
    });
  }
}