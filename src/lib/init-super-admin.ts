import { auth, db } from '@/lib/firebase';
import { userService } from '@/services/firestore';
import { ROLES, COLLECTIONS } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

/**
 * Initialize the first super admin user
 * This should be run once to set up the system
 */
export async function initializeSuperAdmin() {
  try {
    const superAdminData = {
      email: 'superadmin@pharmalynk.com',
      password: 'SuperAdmin123!',
      displayName: 'Super Admin',
      phone: '+1234567890'
    };

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      superAdminData.email, 
      superAdminData.password
    );
    
    const firebaseUser = userCredential.user;

    // Create Firestore user document with super admin role
    await userService.createUser('system', {
      email: superAdminData.email,
      displayName: superAdminData.displayName,
      phone: superAdminData.phone,
      roles: [ROLES.SUPER_ADMIN],
      active: true,
      assignedAreas: [],
      assignedZips: []
    });

    console.log('Super admin created successfully!');
    console.log('Email:', superAdminData.email);
    console.log('Password:', superAdminData.password);
    console.log('User ID:', firebaseUser.uid);
    
    return firebaseUser;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
}

/**
 * Check if super admin exists and create if not
 */
export async function ensureSuperAdmin() {
  try {
    // This is a simple check - in production you might want a more robust way
    // For now, we'll just try to create and handle the error if it already exists
    await initializeSuperAdmin();
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Super admin already exists');
    } else {
      throw error;
    }
  }
}