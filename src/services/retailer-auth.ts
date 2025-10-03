import { auth, db, COLLECTIONS } from '@/lib/firebase';
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
  // This method is deprecated - retailers are now created directly with verification fields
  // Keeping for backward compatibility but updating to work with Retailer collection
  static async createRetailerUser(retailerData: Retailer, tenantId: string): Promise<RetailerUser> {
    try {
      console.log('🏪 Updating retailer with verification fields for:', retailerData.phone);
      
      // Update the retailer document directly with verification fields
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerData.id);
      
      await updateDoc(retailerRef, {
        isVerified: false,
        verificationStatus: 'pending',
        isActive: true,
        lastLoginAt: null,
        uid: `retailer_${retailerData.phone.replace(/\D/g, '')}`,
        email: retailerData.email || `retailer_${retailerData.phone}@pharmalynk.local`,
        updatedAt: serverTimestamp()
      });
      
      const retailerUser: RetailerUser = {
        id: retailerData.id,
        uid: `retailer_${retailerData.phone.replace(/\D/g, '')}`,
        phone: retailerData.phone,
        retailerId: retailerData.id,
        tenantId: tenantId,
        name: retailerData.name,
        email: retailerData.email,
        address: retailerData.address,
        createdAt: retailerData.createdAt || serverTimestamp(),
        lastLoginAt: null,
        isActive: true,
        isVerified: false,
        verificationStatus: 'pending'
      };
      
      console.log('✅ Retailer updated with verification fields:', retailerUser);
      return retailerUser;
      
    } catch (error) {
      console.error('❌ Error updating retailer with verification fields:', error);
      throw error;
    }
  }

  // Get retailer user by phone number
  static async getRetailerUserByPhone(phone: string): Promise<RetailerUser | null> {
    try {
      console.log('🔍 Looking for retailer with phone:', phone);
      
      // Query the Retailer collection directly
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const retailerDoc = querySnapshot.docs[0];
        const retailerData = retailerDoc.data();
        
        console.log('✅ Found retailer:', retailerData.name);
        
        return {
          id: retailerDoc.id,
          uid: retailerData.uid || `retailer_${phone.replace(/\D/g, '')}`,
          phone: retailerData.phone,
          retailerId: retailerDoc.id,
          tenantId: retailerData.tenantId,
          name: retailerData.name,
          email: retailerData.email,
          address: retailerData.address,
          createdAt: retailerData.createdAt,
          lastLoginAt: retailerData.lastLoginAt,
          isActive: retailerData.isActive !== false, // Default to true if not set
          isVerified: retailerData.isVerified || false,
          verificationStatus: retailerData.verificationStatus || 'pending'
        };
      }
      
      console.log('❌ No retailer found with phone:', phone);
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer by phone:', error);
      return null;
    }
  }

  // Get retailer user by retailer ID
  static async getRetailerUserByRetailerId(retailerId: string): Promise<RetailerUser | null> {
    try {
      console.log('🔍 Getting retailer by ID:', retailerId);
      
      // Get the retailer document directly
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        const retailerData = retailerDoc.data();
        
        const retailerUser = {
          id: retailerDoc.id,
          uid: retailerData.uid || `retailer_${retailerData.phone?.replace(/\D/g, '') || 'unknown'}`,
          phone: retailerData.phone,
          retailerId: retailerDoc.id,
          tenantId: retailerData.tenantId,
          name: retailerData.name,
          email: retailerData.email,
          address: retailerData.address,
          createdAt: retailerData.createdAt,
          lastLoginAt: retailerData.lastLoginAt,
          isActive: retailerData.isActive !== false,
          isVerified: retailerData.isVerified || false,
          verificationStatus: retailerData.verificationStatus || 'pending'
        };
        
        console.log('🔍 Returning retailer:', retailerUser.name);
        return retailerUser;
      }
      
      console.log('🔍 No retailer found with ID:', retailerId);
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer by ID:', error);
      return null;
    }
  }

  // Update retailer login timestamp
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      console.log('📝 Updating last login for retailer UID:', uid);
      
      // Find retailer by UID and update lastLoginAt
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const retailerDoc = querySnapshot.docs[0];
        await updateDoc(retailerDoc.ref, {
          lastLoginAt: serverTimestamp()
        });
        console.log('📝 Updated last login for retailer:', retailerDoc.id);
      } else {
        console.log('❌ No retailer found with UID:', uid);
      }
    } catch (error) {
      console.error('❌ Error updating last login:', error);
    }
  }

  // Deactivate retailer user
  static async deactivateRetailerUser(uid: string): Promise<void> {
    try {
      console.log('🔒 Deactivating retailer with UID:', uid);
      
      // Find retailer by UID and deactivate
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const retailerDoc = querySnapshot.docs[0];
        await updateDoc(retailerDoc.ref, {
          isActive: false,
          lastLoginAt: serverTimestamp()
        });
        console.log('🔒 Deactivated retailer:', retailerDoc.id);
      } else {
        console.log('❌ No retailer found with UID:', uid);
      }
    } catch (error) {
      console.error('❌ Error deactivating retailer:', error);
    }
  }

  // Get all retailer users for a tenant
  static async getRetailerUsersByTenant(tenantId: string): Promise<RetailerUser[]> {
    try {
      console.log('🔍 Getting all retailers for tenant:', tenantId);
      
      // Query retailers directly for this tenant
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('tenantId', '==', tenantId));
      const querySnapshot = await getDocs(q);
      
      const users: RetailerUser[] = [];
      querySnapshot.forEach((doc) => {
        const retailerData = doc.data();
        users.push({
          id: doc.id,
          uid: retailerData.uid || `retailer_${retailerData.phone?.replace(/\D/g, '') || 'unknown'}`,
          phone: retailerData.phone,
          retailerId: doc.id,
          tenantId: retailerData.tenantId,
          name: retailerData.name,
          email: retailerData.email,
          address: retailerData.address,
          createdAt: retailerData.createdAt,
          lastLoginAt: retailerData.lastLoginAt,
          isActive: retailerData.isActive !== false,
          isVerified: retailerData.isVerified || false,
          verificationStatus: retailerData.verificationStatus || 'pending'
        });
      });
      
      console.log(`📊 Found ${users.length} retailers for tenant ${tenantId}`);
      return users;
    } catch (error) {
      console.error('❌ Error getting retailers by tenant:', error);
      return [];
    }
  }

  // Verify retailer account after first OTP login
  static async verifyRetailerAccount(phone: string): Promise<RetailerUser | null> {
    try {
      console.log('🔍 Verifying retailer account for phone:', phone);
      
      // Find retailer by phone number
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const retailerDoc = querySnapshot.docs[0];
        
        // Update verification status
        await updateDoc(retailerDoc.ref, {
          isVerified: true,
          verificationStatus: 'verified',
          lastLoginAt: serverTimestamp()
        });
        
        // Get updated retailer data
        const updatedDoc = await getDoc(retailerDoc.ref);
        const retailerData = updatedDoc.data();
        
        if (!retailerData) {
          throw new Error('Retailer data not found after update');
        }
        
        const verifiedUser: RetailerUser = {
          id: updatedDoc.id,
          uid: retailerData.uid || `retailer_${phone.replace(/\D/g, '')}`,
          phone: retailerData.phone,
          retailerId: updatedDoc.id,
          tenantId: retailerData.tenantId,
          name: retailerData.name,
          email: retailerData.email,
          address: retailerData.address,
          createdAt: retailerData.createdAt,
          lastLoginAt: retailerData.lastLoginAt,
          isActive: retailerData.isActive !== false,
          isVerified: true,
          verificationStatus: 'verified'
        };
        
        console.log('✅ Retailer account verified:', verifiedUser);
        return verifiedUser;
      }
      
      console.log('❌ No retailer found with phone:', phone);
      return null;
    } catch (error) {
      console.error('❌ Error verifying retailer account:', error);
      return null;
    }
  }

  // Check if retailer account exists and is pending verification
  static async getPendingRetailerByPhone(phone: string): Promise<RetailerUser | null> {
    try {
      console.log('🔍 Checking for pending retailer with phone:', phone);
      
      // Find retailer by phone number
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const retailerDoc = querySnapshot.docs[0];
        const retailerData = retailerDoc.data();
        
        // Return retailer if it exists and is pending
        if (retailerData.verificationStatus === 'pending') {
          return {
            id: retailerDoc.id,
            uid: retailerData.uid || `retailer_${phone.replace(/\D/g, '')}`,
            phone: retailerData.phone,
            retailerId: retailerDoc.id,
            tenantId: retailerData.tenantId,
            name: retailerData.name,
            email: retailerData.email,
            address: retailerData.address,
            createdAt: retailerData.createdAt,
            lastLoginAt: retailerData.lastLoginAt,
            isActive: retailerData.isActive !== false,
            isVerified: retailerData.isVerified || false,
            verificationStatus: retailerData.verificationStatus || 'pending'
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