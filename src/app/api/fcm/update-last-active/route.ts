import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { token, userId, userType = 'retailers' } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Updating last active for token ${token.substring(0, 20)}... for ${userType} ${userId}`);

    // Update last active timestamp for the device
    const userRef = doc(db, userType, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const devices = userDoc.data()?.fcmDevices || [];
      const updatedDevices = devices.map((device: any) =>
        device.token === token
          ? { ...device, lastActive: Timestamp.now() }
          : device
      );

      await updateDoc(userRef, { 
        fcmDevices: updatedDevices,
        updatedAt: Timestamp.now()
      });
      console.log(`✅ Updated last active for token ${token.substring(0, 20)}...`);
    } else {
      console.warn(`⚠️ User ${userId} not found in ${userType} collection`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Last active timestamp updated',
      userType
    });

  } catch (error) {
    console.error('❌ Error updating last active:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}