import { NextRequest, NextResponse } from 'next/server';
import { initializeSuperAdmin } from '@/lib/init-super-admin';

export async function GET(request: NextRequest) {
  try {
    await initializeSuperAdmin();
    return NextResponse.json({ 
      success: true, 
      message: 'Super admin created successfully',
      credentials: {
        email: 'superadmin@pharmalynk.com',
        password: 'SuperAdmin123!'
      }
    });
  } catch (error: any) {
    console.error('Error initializing super admin:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}