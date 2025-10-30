// Retailer Profile Management - New Architecture
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Retailer Profile Interface (Retailer Controlled)
export interface RetailerProfile {
  id: string;
  profile: {
    realName: string;
    phone: string;
    email?: string;
    address?: string;
    businessType?: string;
    licenseNumber?: string;
  };
  tenantIds: string[];
  verification: {
    isPhoneVerified: boolean;
    verifiedAt?: Timestamp;
    verificationMethod: 'OTP' | 'MANUAL';
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Wholesaler-Retailer Assignment Interface (Wholesaler Controlled)
export interface RetailerAssignment {
  id: string;
  tenantId: string;
  retailerId: string;
  
  // Wholesaler's independent data
  aliasName: string;          // Wholesaler's alias for this retailer
  areaId?: string;            // Assigned area
  zipcodes: string[];         // Assigned zipcodes
  
  // Business data
  creditLimit: number;
  currentBalance: number;
  notes?: string;
  
  // Line worker assignment
  assignedLineWorkerId?: string;
  
  // History
  assignmentHistory: Array<{
    areaId?: string;
    assignedAt: Timestamp;
    assignedBy: string;
    isActive: boolean;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class RetailerProfileService {
  
  /**
   * Retailer creates their own profile
   */
  static async createRetailerProfile(phone: string, profileData: {
    realName: string;
    email?: string;
    address?: string;
    businessType?: string;
    licenseNumber?: string;
  }): Promise<string> {
    try {
      console.log('🏪 Creating retailer profile for phone:', phone);
      
      // Check if profile already exists
      const existingProfile = await this.getRetailerProfileByPhone(phone);
      if (existingProfile) {
        throw new Error('Retailer profile already exists with this phone number');
      }
      
      const retailerId = `retailer_${phone.replace(/\D/g, '')}`;
      const now = Timestamp.now();
      
      const retailerProfile: RetailerProfile = {
        id: retailerId,
        profile: {
          realName: profileData.realName,
          phone: phone,
          email: profileData.email,
          address: profileData.address,
          businessType: profileData.businessType,
          licenseNumber: profileData.licenseNumber
        },
        tenantIds: [], // Start with no wholesaler associations
        verification: {
          isPhoneVerified: false,
          verificationMethod: 'OTP'
        },
        createdAt: now,
        updatedAt: now
      };
      
      // Check if retailer document already exists and preserve its data
      const existingRetailerDoc = await getDoc(doc(db, 'retailers', retailerId));
      if (existingRetailerDoc.exists()) {
        const existingData = existingRetailerDoc.data();
        
        console.log('🔄 Retailer document exists, preserving wholesaler data during profile creation:', {
          retailerId,
          existingWholesalerAssignments: Object.keys(existingData.wholesalerAssignments || {}).length,
          existingWholesalerData: Object.keys(existingData.wholesalerData || {}).length
        });
        
        // Merge existing data with new profile, preserving all existing fields
        const mergedProfile = {
          ...existingData, // Preserve ALL existing fields
          ...retailerProfile, // Override with profile fields
          id: retailerId, // Ensure ID is correct
          // Ensure critical fields are preserved explicitly
          wholesalerAssignments: existingData.wholesalerAssignments || {},
          wholesalerData: existingData.wholesalerData || {},
          tenantIds: existingData.tenantIds || [],
          activeOTPs: existingData.activeOTPs || [],
          recentPayments: existingData.recentPayments || [],
          totalPaidAmount: existingData.totalPaidAmount || 0,
          totalPaymentsCount: existingData.totalPaymentsCount || 0,
          lastPaymentDate: existingData.lastPaymentDate || null,
          computedAt: existingData.computedAt || null,
        };
        
        await setDoc(doc(db, 'retailers', retailerId), mergedProfile);
        
        console.log('✅ Profile created with preserved wholesaler data:', {
          retailerId,
          preservedWholesalerAssignments: Object.keys(mergedProfile.wholesalerAssignments || {}).length,
          preservedWholesalerData: Object.keys(mergedProfile.wholesalerData || {}).length
        });
      } else {
        // Create new document
        await setDoc(doc(db, 'retailers', retailerId), retailerProfile);
        console.log('✅ Created new retailer profile document:', retailerId);
      }
      
      console.log('✅ Retailer profile created:', retailerId);
      return retailerId;
      
    } catch (error) {
      console.error('❌ Error creating retailer profile:', error);
      throw error;
    }
  }
  
  /**
   * Get retailer profile by ID
   */
  static async getRetailerProfile(retailerId: string): Promise<RetailerProfile | null> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        const data = retailerDoc.data();
        
        // Check if this is a legacy retailer document (from wholesaler creation)
        if (data.name || data.phone || data.address) {
          console.log('🔄 Detected legacy retailer document, checking if migration is needed:', retailerId);
          
          // Check if already migrated by looking for profile structure
          if (data.profile && data.profile.realName && data.profile.phone) {
            console.log('✅ Retailer already migrated, skipping migration:', retailerId);
            // Return the existing migrated profile
            const profile: RetailerProfile = {
              id: retailerId,
              profile: data.profile,
              tenantIds: data.tenantIds || [],
              verification: data.verification || {
                isPhoneVerified: false,
                verificationMethod: 'OTP'
              },
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now()
            };
            return profile;
          }
          
          console.log('🔄 Starting migration for legacy retailer:', retailerId);
          
          // Convert legacy format to new profile format
          const profile: RetailerProfile = {
            id: retailerId,
            profile: {
              realName: data.name || '',
              phone: data.phone || '',
              email: data.email || '',
              address: data.address || '',
              businessType: data.businessType || '',
              licenseNumber: data.licenseNumber || ''
            },
            tenantIds: data.tenantIds || [],
            verification: {
              isPhoneVerified: false, // Will be verified during OTP
              verificationMethod: 'OTP'
            },
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now()
          };
          
          // Migrate the document to new format while preserving existing fields
          console.log('🔄 Preserving existing fields during migration:', {
            wholesalerAssignments: Object.keys(data.wholesalerAssignments || {}).length,
            wholesalerData: Object.keys(data.wholesalerData || {}).length,
            tenantIds: (data.tenantIds || []).length,
            activeOTPs: (data.activeOTPs || []).length,
            recentPayments: (data.recentPayments || []).length
          });
          
          const migratedProfile = {
            ...data, // Preserve ALL existing fields like wholesalerAssignments, wholesalerData, recentPayments, etc.
            ...profile, // Override with new profile structure
            // Ensure critical fields are preserved explicitly
            wholesalerAssignments: data.wholesalerAssignments || {},
            wholesalerData: data.wholesalerData || {},
            tenantIds: data.tenantIds || [],
            activeOTPs: data.activeOTPs || [],
            recentPayments: data.recentPayments || [],
            totalPaidAmount: data.totalPaidAmount || 0,
            totalPaymentsCount: data.totalPaymentsCount || 0,
            lastPaymentDate: data.lastPaymentDate || null,
            computedAt: data.computedAt || null,
          };
          
          await setDoc(retailerRef, migratedProfile);
          
          console.log('✅ Successfully migrated legacy retailer to new profile format:', retailerId);
          console.log('✅ Preserved wholesaler assignments:', Object.keys(migratedProfile.wholesalerAssignments || {}).length);
          console.log('✅ Preserved wholesaler data:', Object.keys(migratedProfile.wholesalerData || {}).length);
          
          return profile;
        }
        
        return data as RetailerProfile;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer profile:', error);
      return null;
    }
  }

  /**
   * Get retailer profile by phone
   */
  static async getRetailerProfileByPhone(phone: string): Promise<RetailerProfile | null> {
    try {
      const retailerId = `retailer_${phone.replace(/\D/g, '')}`;
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        return retailerDoc.data() as RetailerProfile;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer profile by phone:', error);
      return null;
    }
  }
  
  /**
   * Update retailer profile (only retailer can do this)
   */
  static async updateRetailerProfile(retailerId: string, updates: {
    realName?: string;
    email?: string;
    address?: string;
    businessType?: string;
    licenseNumber?: string;
  }): Promise<void> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer profile not found');
      }
      
      const data = retailerDoc.data();
      
      // Check if this is a legacy format document
      if (data.name || data.phone || data.address) {
        // Update legacy format
        const updateData: any = {
          name: updates.realName || data.name,
          email: updates.email || data.email,
          address: updates.address || data.address,
          businessType: updates.businessType || data.businessType,
          licenseNumber: updates.licenseNumber || data.licenseNumber,
          updatedAt: Timestamp.now()
        };
        
        await updateDoc(retailerRef, updateData);
      } else {
        // Update new profile format
        const updateData: any = {
          'profile.realName': updates.realName,
          'profile.email': updates.email,
          'profile.address': updates.address,
          'profile.businessType': updates.businessType,
          'profile.licenseNumber': updates.licenseNumber,
          updatedAt: Timestamp.now()
        };
        
        await updateDoc(retailerRef, updateData);
      }
      
      console.log('✅ Retailer profile updated:', retailerId);
    } catch (error) {
      console.error('❌ Error updating retailer profile:', error);
      throw error;
    }
  }
  
  /**
   * Verify phone number after OTP
   */
  static async verifyPhone(retailerId: string): Promise<void> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer profile not found');
      }
      
      const data = retailerDoc.data();
      
      // Check if this is a legacy format document
      if (data.name || data.phone || data.address) {
        // Update legacy format with verification info
        await updateDoc(retailerRef, {
          phoneVerified: true,
          phoneVerifiedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      } else {
        // Update new profile format
        await updateDoc(retailerRef, {
          'verification.isPhoneVerified': true,
          'verification.verifiedAt': Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      console.log('✅ Phone verified for retailer:', retailerId);
    } catch (error) {
      console.error('❌ Error verifying phone:', error);
      throw error;
    }
  }
  
  /**
   * Add wholesaler association to retailer
   */
  static async addWholesalerAssociation(retailerId: string, tenantId: string): Promise<void> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      
      await updateDoc(retailerRef, {
        tenantIds: arrayUnion(tenantId),
        updatedAt: Timestamp.now()
      });
      
      console.log('✅ Wholesaler association added:', retailerId, tenantId);
    } catch (error) {
      console.error('❌ Error adding wholesaler association:', error);
      throw error;
    }
  }
  
  /**
   * Remove wholesaler association from retailer
   */
  static async removeWholesalerAssociation(retailerId: string, tenantId: string): Promise<void> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      
      await updateDoc(retailerRef, {
        tenantIds: arrayRemove(tenantId),
        updatedAt: Timestamp.now()
      });
      
      console.log('✅ Wholesaler association removed:', retailerId, tenantId);
    } catch (error) {
      console.error('❌ Error removing wholesaler association:', error);
      throw error;
    }
  }
}

export class RetailerAssignmentService {
  
  /**
   * Wholesaler creates assignment for existing retailer
   */
  static async createRetailerAssignment(tenantId: string, retailerId: string, assignmentData: {
    aliasName: string;
    areaId?: string;
    zipcodes: string[];
    creditLimit?: number;
    notes?: string;
  }): Promise<string> {
    try {
      console.log('🔗 Creating retailer assignment:', { tenantId, retailerId });
      
      // Check if assignment already exists
      const existingAssignment = await this.getRetailerAssignment(tenantId, retailerId);
      if (existingAssignment) {
        throw new Error('Retailer already assigned to this wholesaler');
      }
      
      const assignmentId = `${tenantId}_${retailerId}`;
      const now = Timestamp.now();
      
      const assignmentHistoryEntry: any = {
        assignedAt: now,
        assignedBy: tenantId,
        isActive: true
      };
      
      // Only include areaId in assignmentHistory if it's defined
      if (assignmentData.areaId) {
        assignmentHistoryEntry.areaId = assignmentData.areaId;
      }
      
      const assignment: RetailerAssignment = {
        id: assignmentId,
        tenantId,
        retailerId,
        aliasName: assignmentData.aliasName,
        zipcodes: assignmentData.zipcodes,
        creditLimit: assignmentData.creditLimit || 0,
        currentBalance: 0,
        notes: assignmentData.notes,
        assignmentHistory: [assignmentHistoryEntry],
        createdAt: now,
        updatedAt: now
      };
      
      // Only include areaId if it's defined
      if (assignmentData.areaId) {
        assignment.areaId = assignmentData.areaId;
      }
      
      await setDoc(doc(db, 'retailerAssignments', assignmentId), assignment);
      
      // Add wholesaler to retailer's tenantIds
      await RetailerProfileService.addWholesalerAssociation(retailerId, tenantId);
      
      console.log('✅ Retailer assignment created:', assignmentId);
      return assignmentId;
      
    } catch (error) {
      console.error('❌ Error creating retailer assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get retailer assignment
   */
  static async getRetailerAssignment(tenantId: string, retailerId: string): Promise<RetailerAssignment | null> {
    try {
      const assignmentId = `${tenantId}_${retailerId}`;
      const assignmentRef = doc(db, 'retailerAssignments', assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);
      
      if (assignmentDoc.exists()) {
        return assignmentDoc.data() as RetailerAssignment;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting retailer assignment:', error);
      return null;
    }
  }
  
  /**
   * Update retailer assignment (wholesaler controlled)
   */
  static async updateRetailerAssignment(tenantId: string, retailerId: string, updates: {
    aliasName?: string;
    areaId?: string;
    zipcodes?: string[];
    creditLimit?: number;
    notes?: string;
    assignedLineWorkerId?: string;
  }): Promise<void> {
    try {
      const assignmentId = `${tenantId}_${retailerId}`;
      const assignmentRef = doc(db, 'retailerAssignments', assignmentId);
      
      // Check if assignment exists first
      const assignmentDoc = await getDoc(assignmentRef);
      if (!assignmentDoc.exists()) {
        throw new Error(`No document to update: Assignment ${assignmentId} does not exist`);
      }
      
      const updateData: any = {
        updatedAt: Timestamp.now()
      };
      
      if (updates.aliasName !== undefined) updateData.aliasName = updates.aliasName;
      if (updates.areaId !== undefined) updateData.areaId = updates.areaId;
      if (updates.zipcodes !== undefined) updateData.zipcodes = updates.zipcodes;
      if (updates.creditLimit !== undefined) updateData.creditLimit = updates.creditLimit;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.assignedLineWorkerId !== undefined) updateData.assignedLineWorkerId = updates.assignedLineWorkerId;
      
      await updateDoc(assignmentRef, updateData);
      
      console.log('✅ Retailer assignment updated:', assignmentId);
    } catch (error) {
      console.error('❌ Error updating retailer assignment:', error);
      throw error;
    }
  }
  
  /**
   * Delete retailer assignment (soft delete - removes association)
   */
  static async deleteRetailerAssignment(tenantId: string, retailerId: string): Promise<void> {
    try {
      const assignmentId = `${tenantId}_${retailerId}`;
      const assignmentRef = doc(db, 'retailerAssignments', assignmentId);
      
      await deleteDoc(assignmentRef);
      
      // Remove wholesaler from retailer's tenantIds
      await RetailerProfileService.removeWholesalerAssociation(retailerId, tenantId);
      
      console.log('✅ Retailer assignment deleted:', assignmentId);
    } catch (error) {
      console.error('❌ Error deleting retailer assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get all assignments for a wholesaler
   */
  static async getWholesalerAssignments(tenantId: string): Promise<RetailerAssignment[]> {
    try {
      const assignmentsRef = collection(db, 'retailerAssignments');
      const q = query(assignmentsRef, where('tenantId', '==', tenantId));
      const querySnapshot = await getDocs(q);
      
      const assignments: RetailerAssignment[] = [];
      querySnapshot.forEach((doc) => {
        assignments.push(doc.data() as RetailerAssignment);
      });
      
      return assignments;
    } catch (error) {
      console.error('❌ Error getting wholesaler assignments:', error);
      return [];
    }
  }
  
  /**
   * Get all assignments for a retailer
   */
  static async getRetailerAssignments(retailerId: string): Promise<RetailerAssignment[]> {
    try {
      const assignmentsRef = collection(db, 'retailerAssignments');
      const q = query(assignmentsRef, where('retailerId', '==', retailerId));
      const querySnapshot = await getDocs(q);
      
      const assignments: RetailerAssignment[] = [];
      querySnapshot.forEach((doc) => {
        assignments.push(doc.data() as RetailerAssignment);
      });
      
      return assignments;
    } catch (error) {
      console.error('❌ Error getting retailer assignments:', error);
      return [];
    }
  }
}