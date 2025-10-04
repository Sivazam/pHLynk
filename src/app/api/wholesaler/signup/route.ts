// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface WholesalerSignupData {
  businessName: string;
  ownerName: string;
  address: string;
  email: string;
  gstNumber?: string;
  mobileNumber: string;
  password: string;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Wholesaler signup API endpoint called');
  
  try {
    const body = await request.json();
    console.log('📥 Received signup data:', { businessName: body.businessName, email: body.email });
    
    const {
      businessName,
      ownerName,
      address,
      email,
      gstNumber,
      mobileNumber,
      password
    }: WholesalerSignupData = body;

    // Validate required fields
    if (!businessName || !ownerName || !address || !email || !mobileNumber || !password) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Check if email already exists in Firebase Auth
    try {
      // Check if user already exists by trying to get user data
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      // Check if business name already exists
      const tenantsRef = collection(db, 'tenants');
      const businessQuery = query(tenantsRef, where('name', '==', businessName));
      const businessSnapshot = await getDocs(businessQuery);
      
      if (!businessSnapshot.empty) {
        return NextResponse.json(
          { error: 'A business with this name already exists' },
          { status: 409 }
        );
      }

    } catch (error) {
      console.error('Error checking existing accounts:', error);
      return NextResponse.json(
        { error: 'Failed to validate account information' },
        { status: 500 }
      );
    }

    // Create Firebase Auth user
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error creating Firebase Auth user:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      } else if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password is too weak' },
          { status: 400 }
        );
      } else if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        );
      }
    }

    const user = userCredential.user;

    try {
      // Create tenant document with PENDING status
      const tenantId = doc(collection(db, 'tenants')).id;
      const tenantRef = doc(db, 'tenants', tenantId);
      
      const tenantData = {
        name: businessName,
        status: 'PENDING',
        subscriptionStatus: 'TRIAL',
        plan: 'BASIC',
        address: address,
        gstNumber: gstNumber || null,
        ownerName: ownerName,
        contactEmail: email,
        contactPhone: mobileNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid
      };

      await setDoc(tenantRef, tenantData);

      // Create user document with WHOLESALER_ADMIN role
      const userRef = doc(db, 'users', user.uid);
      const userData = {
        email: email,
        phone: mobileNumber,
        displayName: ownerName,
        roles: ['WHOLESALER_ADMIN'],
        active: true,
        tenantId: tenantId,
        wholesalerName: businessName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };

      await setDoc(userRef, userData);

      // Send email verification (optional - you can implement this later)
      // await sendEmailVerification(user);

      return NextResponse.json({
        success: true,
        message: 'Wholesaler account created successfully. Please wait for admin approval.',
        tenantId: tenantId,
        userId: user.uid,
        status: 'PENDING'
      });

    } catch (error) {
      console.error('❌ Error creating tenant/user documents:', error);
      
      // Clean up: Delete the Firebase Auth user if document creation fails
      try {
        await user.delete();
        console.log('🧹 Cleaned up Firebase Auth user due to document creation failure');
      } catch (deleteError) {
        console.error('❌ Error deleting Firebase Auth user during cleanup:', deleteError);
      }

      return NextResponse.json(
        { error: 'Failed to complete account setup' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error in wholesaler signup:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}