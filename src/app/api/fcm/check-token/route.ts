import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking if token ${token.substring(0, 20)}... is registered for user ${userId}`);

    // Check if token exists for this user
    const devices = await fcmService.getRetailerDevices(userId);
    const tokenExists = devices.some(device => device.token === token);

    console.log(`📱 Token check result: ${tokenExists ? 'EXISTS' : 'NOT_FOUND'} for user ${userId}`);

    return NextResponse.json({
      exists: tokenExists,
      deviceCount: devices.length,
      devices: devices.map(d => ({
        token: d.token.substring(0, 20) + '...',
        lastActive: d.lastActive,
        userAgent: d.userAgent
      }))
    });

  } catch (error) {
    console.error('❌ Error checking token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}