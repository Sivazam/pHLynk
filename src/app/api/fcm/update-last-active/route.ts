import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Updating last active for token ${token.substring(0, 20)}... for user ${userId}`);

    // Update last active timestamp for the device
    const userRef = doc(db, 'retailers', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const devices = userDoc.data()?.fcmDevices || [];
      const updatedDevices = devices.map((device: any) =>
        device.token === token
          ? { ...device, lastActive: new Date() }
          : device
      );

      await updateDoc(userRef, { fcmDevices: updatedDevices });
      console.log(`✅ Updated last active for token ${token.substring(0, 20)}...`);
    } else {
      console.warn(`⚠️ User ${userId} not found in retailers collection`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Last active timestamp updated'
    });

  } catch (error) {
    console.error('❌ Error updating last active:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}