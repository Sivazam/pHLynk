import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Retailer } from '@/types';

export interface RetailerUser {
  id: string;
  uid: string;
  phone: string;
  retailerId: string;
  tenantId: string;
  name: string;
  email?: string;
  address?: string;
  createdAt: any;
  lastLoginAt: any;
  isActive: boolean;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'inactive';
}

export class RetailerAuthService {
  // Create or update retailer user account when wholesale admin adds retailer
  static async createRetailerUser(retailerData: Retailer, tenantId: string): Promise<RetailerUser> {
    try {
      console.log('🏪 Creating retailer user account for:', retailerData.phone);
      
      // Generate a unique user ID based on phone number
      const uid = `retailer_${retailerData.phone.replace(/\D/g, '')}`;
      
      // Check if user already exists
      const userRef = doc(db, 'retailerUsers', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        console.log('👤 Retailer user already exists, updating...');
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          isActive: true,
          retailerId: retailerData.id,
          tenantId: tenantId,
          name: retailerData.name,
          phone: retailerData.phone,
          email: retailerData.email || '',
          address: retailerData.address || ''
        });
      } else {
        console.log('🆕 Creating new retailer user...');
        await setDoc(userRef, {
          uid: uid,
          phone: retailerData.phone,
          retailerId: retailerData.id,
          tenantId: tenantId,
          name: retailerData.name,
          email: retailerData.email || '',
          address: retailerData.address || '',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          isActive: true,
          isVerified: false,
          verificationStatus: 'pending'
        });
      }
      
      const retailerUser: RetailerUser = {
        id: uid,
        uid: uid,
        phone: retailerData.phone,
        retailerId: retailerData.id,
        tenantId: tenantId,
        name: retailerData.name,
        email: retailerData.email,
        address: retailerData.address,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        isVerified: false,
        verificationStatus: 'pending'
      };
      
      console.log('✅ Retailer user account created/updated:', retailerUser);
      return retailerUser;
      
    } catch (error) {
      console.error('❌ Error creating retailer user:', error);
      throw error;
    }
  }

  // Get retailer user by phone number
  static async getRetailerUserByPhone(phone: string): Promise<RetailerUser | null> {
    try {
      const uid = `retailer_${phone.replace(/\D/g, '')}`;
      const userRef = doc(db, 'retailerUsers', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: userDoc.id,
          uid: userData.uid,
          phone: userData.phone,
          retailerId: userData.retailerId,
          tenantId: userData.tenantId,
          name: userData.name,
          email: userData.email,
          address: userData.address,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          isActive: userData.isActive,
          isVerified: userData.isVerified || false,
          verificationStatus: userData.verificationStatus || 'pending'
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer user by phone:', error);
      return null;
    }
  }

  // Get retailer user by retailer ID
  static async getRetailerUserByRetailerId(retailerId: string): Promise<RetailerUser | null> {
    try {
      console.log('🔍 Getting retailer user by retailer ID:', retailerId);
      
      const usersRef = collection(db, 'retailerUsers');
      const q = query(usersRef, where('retailerId', '==', retailerId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        const retailerUser = {
          id: userDoc.id,
          uid: userData.uid,
          phone: userData.phone,
          retailerId: userData.retailerId,
          tenantId: userData.tenantId,
          name: userData.name,
          email: userData.email,
          address: userData.address,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          isActive: userData.isActive,
          isVerified: userData.isVerified || false,
          verificationStatus: userData.verificationStatus || 'pending'
        };
        
        console.log('🔍 Returning retailer user:', retailerUser);
        return retailerUser;
      }
      
      console.log('🔍 No retailer user found for retailer ID:', retailerId);
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer user by retailer ID:', error);
      return null;
    }
  }

  // Update retailer user login timestamp
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'retailerUsers', uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
      console.log('📝 Updated last login for retailer user:', uid);
    } catch (error) {
      console.error('❌ Error updating last login:', error);
    }
  }

  // Deactivate retailer user
  static async deactivateRetailerUser(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'retailerUsers', uid);
      await updateDoc(userRef, {
        isActive: false,
        lastLoginAt: serverTimestamp()
      });
      console.log('🔒 Deactivated retailer user:', uid);
    } catch (error) {
      console.error('❌ Error deactivating retailer user:', error);
    }
  }

  // Get all retailer users for a tenant
  static async getRetailerUsersByTenant(tenantId: string): Promise<RetailerUser[]> {
    try {
      const usersRef = collection(db, 'retailerUsers');
      const q = query(usersRef, where('tenantId', '==', tenantId));
      const querySnapshot = await getDocs(q);
      
      const users: RetailerUser[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          id: doc.id,
          uid: userData.uid,
          phone: userData.phone,
          retailerId: userData.retailerId,
          tenantId: userData.tenantId,
          name: userData.name,
          email: userData.email,
          address: userData.address,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          isActive: userData.isActive,
          isVerified: userData.isVerified || false,
          verificationStatus: userData.verificationStatus || 'pending'
        });
      });
      
      return users;
    } catch (error) {
      console.error('❌ Error getting retailer users by tenant:', error);
      return [];
    }
  }

  // Verify retailer account after first OTP login
  static async verifyRetailerAccount(phone: string): Promise<RetailerUser | null> {
    try {
      const uid = `retailer_${phone.replace(/\D/g, '')}`;
      const userRef = doc(db, 'retailerUsers', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        console.log('🔍 Verifying retailer account for phone:', phone);
        
        // Update verification status
        await updateDoc(userRef, {
          isVerified: true,
          verificationStatus: 'verified',
          lastLoginAt: serverTimestamp()
        });
        
        // Get updated user data
        const updatedDoc = await getDoc(userRef);
        const userData = updatedDoc.data();
        
        if (!userData) {
          throw new Error('User data not found after update');
        }
        
        const verifiedUser: RetailerUser = {
          id: updatedDoc.id,
          uid: userData.uid,
          phone: userData.phone,
          retailerId: userData.retailerId,
          tenantId: userData.tenantId,
          name: userData.name,
          email: userData.email,
          address: userData.address,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          isActive: userData.isActive,
          isVerified: true,
          verificationStatus: 'verified'
        };
        
        console.log('✅ Retailer account verified:', verifiedUser);
        return verifiedUser;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error verifying retailer account:', error);
      return null;
    }
  }

  // Check if retailer account exists and is pending verification
  static async getPendingRetailerByPhone(phone: string): Promise<RetailerUser | null> {
    try {
      const uid = `retailer_${phone.replace(/\D/g, '')}`;
      const userRef = doc(db, 'retailerUsers', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Return user if it exists and is pending
        if (userData.verificationStatus === 'pending') {
          return {
            id: userDoc.id,
            uid: userData.uid,
            phone: userData.phone,
            retailerId: userData.retailerId,
            tenantId: userData.tenantId,
            name: userData.name,
            email: userData.email,
            address: userData.address,
            createdAt: userData.createdAt,
            lastLoginAt: userData.lastLoginAt,
            isActive: userData.isActive,
            isVerified: userData.isVerified || false,
            verificationStatus: userData.verificationStatus || 'pending'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting pending retailer by phone:', error);
      return null;
    }
  }
}