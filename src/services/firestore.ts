import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
  writeBatch,
  arrayUnion,
  arrayRemove,
  deleteField
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, COLLECTIONS, ROLES } from '@/lib/firebase';
import { toMillis, toDate, compareTimestamps } from '@/lib/timestamp-utils';
import { logger } from '@/lib/logger';
import { RetailerAuthService } from './retailer-auth';
import { 
  Tenant, 
  User, 
  Area, 
  Retailer, 
  Payment, 
  PaymentEvent, 
  Subscription,
  Config,
  OTP,
  BaseDocument,
  CreateTenantForm,
  CreateAreaForm,
  CreateRetailerForm,
  InitiatePaymentForm,
  DashboardStats,
  LineWorkerPerformance,
  AreaPerformance,
  ProductData,
  MonthlyTargets,
  MonthlyTarget
} from '@/types';

// Generic CRUD operations
export class FirestoreService<T extends BaseDocument> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        tenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      logger.error(`Error creating document in ${this.collectionName}`, error, { context: 'FirestoreService' });
      throw error;
    }
  }

  async getById(id: string, tenantId: string): Promise<T | null> {
    try {
      logger.debug('getById called for collection', this.collectionName, { context: 'FirestoreService' });
      logger.debug('Document ID', id, { context: 'FirestoreService' });
      logger.debug('Tenant ID', tenantId, { context: 'FirestoreService' });
      
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      logger.debug('Document exists', docSnap.exists(), { context: 'FirestoreService' });
      if (docSnap.exists()) {
        const data = docSnap.data();
        logger.debug('Document tenantId', data.tenantId, { context: 'FirestoreService' });
        logger.debug('Tenant ID match', data.tenantId === tenantId, { context: 'FirestoreService' });
        
        if (data.tenantId === tenantId) {
          logger.debug('Document found and tenant ID matches', { context: 'FirestoreService' });
          return { id: docSnap.id, ...data } as T;
        } else {
          logger.warn('Tenant ID mismatch - document belongs to different tenant', { context: 'FirestoreService' });
        }
      } else {
        logger.debug('Document does not exist', { context: 'FirestoreService' });
      }
      return null;
    } catch (error) {
      logger.error(`Error getting document ${id} from ${this.collectionName}`, error, { context: 'FirestoreService' });
      throw error;
    }
  }

  async getAll(tenantId: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(
        collection(db, this.collectionName), 
        where('tenantId', '==', tenantId),
        ...constraints
      );
      const querySnapshot = await getDocs(q);
      
      const documents: T[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });
      
      return documents;
    } catch (error) {
      logger.error(`Error getting documents from ${this.collectionName}`, error, { context: 'FirestoreService' });
      throw error;
    }
  }

  async update(id: string, data: Partial<T>, tenantId: string): Promise<void> {
    try {
      logger.debug('update called for collection', this.collectionName, { context: 'FirestoreService' });
      logger.debug('Document ID', id, { context: 'FirestoreService' });
      logger.debug('Tenant ID', tenantId, { context: 'FirestoreService' });
      logger.debug('Data to update', Object.keys(data), { context: 'FirestoreService' });
      
      const docRef = doc(db, this.collectionName, id);
      
      // Process the data to handle field deletions
      const processedData: any = {};
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value === null) {
          // Use deleteField() to remove the field
          processedData[key] = deleteField();
        } else if (value !== undefined) {
          processedData[key] = value;
        }
      });
      
      logger.debug('Processed data keys', Object.keys(processedData), { context: 'FirestoreService' });
      
      await updateDoc(docRef, {
        ...processedData,
        updatedAt: Timestamp.now()
      });
      
      logger.debug('Document updated successfully', { context: 'FirestoreService' });
    } catch (error) {
      logger.error(`Error updating document ${id} in ${this.collectionName}`, error, { context: 'FirestoreService' });
      throw error;
    }
  }

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      logger.error(`Error deleting document ${id} from ${this.collectionName}`, error, { context: 'FirestoreService' });
      throw error;
    }
  }

  async query(tenantId: string, constraints: QueryConstraint[]): Promise<T[]> {
    try {
      const q = query(
        collection(db, this.collectionName), 
        where('tenantId', '==', tenantId),
        ...constraints
      );
      const querySnapshot = await getDocs(q);
      
      const documents: T[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });
      
      return documents;
    } catch (error) {
      logger.error(`Error querying ${this.collectionName}`, error, { context: 'FirestoreService' });
      throw error;
    }
  }
}

// Service classes for each entity
export class TenantService extends FirestoreService<Tenant> {
  constructor() {
    super(COLLECTIONS.TENANTS);
  }

  async createTenant(data: CreateTenantForm): Promise<string> {
    try {
      // For tenants, we need to create the document first to get the ID, then set tenantId to match
      const docRef = await addDoc(collection(db, this.collectionName), {
        name: data.name,
        status: 'ACTIVE',
        subscriptionStatus: 'ACTIVE',
        plan: data.plan,
        tenantId: 'temp', // Will be updated after getting the ID
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Update the document with the correct tenantId (same as document ID)
      await updateDoc(docRef, {
        tenantId: docRef.id
      });
      
      return docRef.id;
    } catch (error) {
      logger.error('Error creating tenant', error, { context: 'TenantService' });
      throw error;
    }
  }

  async getAllTenants(): Promise<Tenant[]> {
    try {
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      
      const tenants: Tenant[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        tenants.push({ id: doc.id, ...doc.data() } as Tenant);
      });
      
      return tenants;
    } catch (error) {
      logger.error('Error getting all tenants', error, { context: 'TenantService' });
      throw error;
    }
  }
}

export class UserService extends FirestoreService<User> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  async createUserWithAuth(tenantId: string, data: {
    email: string;
    password: string;
    displayName?: string;
    phone?: string;
    roles: (keyof typeof ROLES)[];
    assignedAreas?: string[];
    assignedZips?: string[];
  }): Promise<string> {
    const { email, password, displayName, phone, roles, assignedAreas, assignedZips } = data;
    
    try {
      // Import here to avoid circular dependency
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create Firestore user document with the Firebase Auth UID as document ID
      // Only include defined fields to avoid Firestore errors
      const userData: any = {
        email,
        displayName: displayName || email.split('@')[0],
        roles,
        active: true
      };

      // Only add phone if it's defined
      if (phone) {
        userData.phone = phone;
      }

      // Only add assignedAreas if it's defined and not empty
      if (assignedAreas && assignedAreas.length > 0) {
        userData.assignedAreas = assignedAreas;
      }

      // Only add assignedZips if it's defined and not empty
      if (assignedZips && assignedZips.length > 0) {
        userData.assignedZips = assignedZips;
      }
      
      await this.createUserWithId(firebaseUser.uid, tenantId, userData);
      
      return firebaseUser.uid;
    } catch (error) {
      logger.error('Error creating user with auth', error, { context: 'UserService' });
      throw error;
    }
  }

  async createUser(tenantId: string, data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): Promise<string> {
    return this.create(data as Omit<User, 'id' | 'createdAt' | 'updatedAt'>, tenantId);
  }

  async createUserWithId(userId: string, tenantId: string, data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, userId);
      
      // Filter out undefined values to avoid Firestore errors
      const filteredData: any = {};
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined) {
          filteredData[key] = value;
        }
      });
      
      await setDoc(docRef, {
        ...filteredData,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      logger.error(`Error creating user document with ID ${userId}`, error, { context: 'UserService' });
      throw error;
    }
  }

  async getUsersByRole(tenantId: string, role: string): Promise<User[]> {
    return this.query(tenantId, [
      where('roles', 'array-contains', role),
      where('active', '==', true)
    ]);
  }

  async getAllUsersByRole(tenantId: string, role: string): Promise<User[]> {
    return this.query(tenantId, [
      where('roles', 'array-contains', role)
    ]);
  }

  async getLineWorkersForArea(tenantId: string, areaId: string): Promise<User[]> {
    return this.query(tenantId, [
      where('roles', 'array-contains', 'LINE_WORKER'),
      where('assignedAreas', 'array-contains', areaId),
      where('active', '==', true)
    ]);
  }

  async assignAreasToUser(userId: string, tenantId: string, areaIds: string[]): Promise<void> {
    await this.update(userId, { assignedAreas: areaIds }, tenantId);
  }

  async assignZipsToUser(userId: string, tenantId: string, zipcodes: string[]): Promise<void> {
    await this.update(userId, { assignedZips: zipcodes }, tenantId);
  }
}

export class AreaService extends FirestoreService<Area> {
  constructor() {
    super(COLLECTIONS.AREAS);
  }

  async createArea(tenantId: string, data: CreateAreaForm): Promise<string> {
    return this.create({
      name: data.name,
      zipcodes: data.zipcodes,
      active: true
    } as Omit<Area, 'id' | 'createdAt' | 'updatedAt'>, tenantId);
  }

  async getActiveAreas(tenantId: string): Promise<Area[]> {
    return this.query(tenantId, [where('active', '==', true)]);
  }

  async getAreasByZipcode(tenantId: string, zipcode: string): Promise<Area[]> {
    return this.query(tenantId, [
      where('active', '==', true),
      where('zipcodes', 'array-contains', zipcode)
    ]);
  }

  async deleteArea(tenantId: string, areaId: string): Promise<void> {
    return this.delete(areaId, tenantId);
  }
}

export class RetailerService extends FirestoreService<Retailer> {
  constructor() {
    super(COLLECTIONS.RETAILERS);
  }

  async createRetailer(tenantId: string, data: CreateRetailerForm): Promise<string> {
    // Create the retailer document first
    const retailerId = await this.create({
      name: data.name,
      phone: data.phone,
      address: data.address,
      areaId: data.areaId,
      zipcodes: data.zipcodes
    } as Omit<Retailer, 'id' | 'createdAt' | 'updatedAt'>, tenantId);

    // Create retailer user account for login
    try {
      const retailerData: Retailer = {
        id: retailerId,
        tenantId: tenantId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        areaId: data.areaId,
        zipcodes: data.zipcodes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await RetailerAuthService.createRetailerUser(retailerData, tenantId);
      logger.success('Retailer user account created for', data.phone, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error creating retailer user account', error, { context: 'RetailerService' });
      // Don't throw here - the retailer was created successfully
    }

    return retailerId;
  }

  async getRetailersByArea(tenantId: string, areaId: string): Promise<Retailer[]> {
    return this.query(tenantId, [where('areaId', '==', areaId)]);
  }

  async getRetailersByZipcode(tenantId: string, zipcode: string): Promise<Retailer[]> {
    return this.query(tenantId, [where('zipcodes', 'array-contains', zipcode)]);
  }

  // updateOutstanding function disabled - invoices have been removed
  // async updateOutstanding(retailerId: string, tenantId: string, amount: number): Promise<void> {
  //   const retailer = await this.getById(retailerId, tenantId);
  //   if (retailer) {
  //     await this.update(retailerId, { 
  //       currentOutstanding: Math.max(0, retailer.currentOutstanding + amount),
  //       computedAt: Timestamp.now()
  //     }, tenantId);
  //   }
  // }

  // Update retailer computed fields when payment is completed
  async updateForPayment(retailerId: string, tenantId: string, payment: any): Promise<void> {
    const retailer = await this.getById(retailerId, tenantId);
    if (retailer) {
      // Since we don't have invoices anymore, outstanding is always 0
      const newTotalPaidAmount = (retailer.totalPaidAmount || 0) + payment.totalPaid;
      const newTotalPaymentsCount = (retailer.totalPaymentsCount || 0) + 1;
      
      // Update recent payments (keep last 5)
      const recentPayments = retailer.recentPayments || [];
      const newPaymentSummary = {
        id: payment.id,
        amount: payment.totalPaid,
        method: payment.method,
        date: payment.createdAt,
        state: payment.state
      };
      
      const updatedRecentPayments = [newPaymentSummary, ...recentPayments].slice(0, 5);
      
      await this.update(retailerId, {
        totalPaidAmount: newTotalPaidAmount,
        totalPaymentsCount: newTotalPaymentsCount,
        lastPaymentDate: payment.createdAt,
        recentPayments: updatedRecentPayments,
        computedAt: Timestamp.now()
      }, tenantId);
      
      logger.success(`Updated retailer ${retailerId} for payment: +₹${payment.totalPaid}`, { context: 'RetailerService' });
    }
  }

  // Recompute all retailer data from scratch (for data correction/migration)
  async recomputeRetailerData(retailerId: string, tenantId: string): Promise<void> {
    try {
      logger.debug(`Recomputing data for retailer ${retailerId}`, { context: 'RetailerService' });
      
      // Get all related data
      const paymentService = new PaymentService();
      
      const payments = await paymentService.getPaymentsByRetailer(tenantId, retailerId);
      
      logger.debug(`Retailer ${retailerId} - Found ${payments.length} payments`, { context: 'RetailerService' });
      
      // Log payment details
      payments.forEach((p, index) => {
        logger.debug(`Payment ${index + 1}`, { id: p.id, amount: p.totalPaid, state: p.state, date: p.createdAt }, { context: 'RetailerService' });
      });
      
      // Compute totals - only consider completed payments
      const totalPaidAmount = payments.filter(p => p.state === 'COMPLETED')
                                   .reduce((sum, p) => sum + p.totalPaid, 0);
      
      logger.debug(`Retailer ${retailerId} summary`, { totalPaid: totalPaidAmount }, { context: 'RetailerService' });
      
      // Get recent payments
      const recentPayments = payments
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          amount: p.totalPaid,
          method: p.method,
          date: p.createdAt,
          state: p.state
        }));
      
      // Get last payment date
      const lastPaymentDate = payments.length > 0 ? 
        payments.reduce((latest, p) => toMillis(p.createdAt) > toMillis(latest) ? p : latest).createdAt : 
        null;
      
      // Update retailer with computed data
      await this.update(retailerId, {
        totalPaidAmount,
        totalPaymentsCount: payments.filter(p => p.state === 'COMPLETED').length,
        lastPaymentDate: lastPaymentDate || undefined,
        recentPayments,
        computedAt: Timestamp.now()
      }, tenantId);
      
      logger.success(`Recomputed data for retailer ${retailerId}: payments ${payments.length}`, { context: 'RetailerService' });
      
    } catch (error) {
      logger.error(`Error recomputing data for retailer ${retailerId}`, error, { context: 'RetailerService' });
      throw error;
    }
  }

  async deleteRetailer(tenantId: string, retailerId: string): Promise<void> {
    return this.delete(retailerId, tenantId);
  }

  async assignLineWorker(tenantId: string, retailerId: string, lineWorkerId: string | null): Promise<void> {
    try {
      await this.update(retailerId, {
        assignedLineWorkerId: lineWorkerId || undefined
      }, tenantId);
      logger.success(`${lineWorkerId ? 'Assigned' : 'Unassigned'} retailer ${retailerId} ${lineWorkerId ? 'to' : 'from'} line worker ${lineWorkerId || '(unassigned)'}`, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error assigning line worker to retailer', error, { context: 'RetailerService' });
      throw error;
    }
  }

  async getRetailersByLineWorker(tenantId: string, lineWorkerId: string): Promise<Retailer[]> {
    return this.query(tenantId, [
      where('assignedLineWorkerId', '==', lineWorkerId)
    ]);
  }

  async getUnassignedRetailers(tenantId: string): Promise<Retailer[]> {
    return this.query(tenantId, [
      where('assignedLineWorkerId', '==', null)
    ]);
  }

  // OTP Management Methods
  async addOTPToRetailer(retailerId: string, tenantId: string, otpData: {
    paymentId: string;
    code: string;
    amount: number;
    lineWorkerName: string;
    expiresAt: Timestamp;
    createdAt: Timestamp;
    isUsed?: boolean;
    usedAt?: Timestamp;
  }): Promise<void> {
    try {
      logger.debug('addOTPToRetailer called', { retailerId, tenantId, paymentId: otpData.paymentId }, { context: 'OTPService' });
      
      const retailer = await this.getById(retailerId, tenantId);
      logger.debug('Retailer found in addOTPToRetailer', retailer ? 'YES' : 'NO', { context: 'OTPService' });
      
      if (!retailer) {
        throw new Error('Retailer not found');
      }

      // Initialize activeOTPs array if it doesn't exist
      const activeOTPs = retailer.activeOTPs || [];
      logger.debug('Current activeOTPs count', activeOTPs.length, { context: 'OTPService' });
      
      // Add new OTP to the array
      activeOTPs.push(otpData);
      logger.debug('New activeOTPs count', activeOTPs.length, { context: 'OTPService' });

      // Update retailer document with new OTP
      logger.debug('Updating retailer document with new OTP array', { context: 'OTPService' });
      await this.update(retailerId, {
        activeOTPs
      }, tenantId);

      logger.success(`OTP added to retailer ${retailerId} for payment ${otpData.paymentId}`, { context: 'OTPService' });
    } catch (error) {
      logger.error('Error adding OTP to retailer', error, { context: 'OTPService' });
      throw error;
    }
  }

  async getActiveOTPsFromRetailer(retailerId: string, tenantId: string): Promise<Array<{
    paymentId: string;
    code: string;
    amount: number;
    lineWorkerName: string;
    expiresAt: Timestamp;
    createdAt: Timestamp;
    isUsed?: boolean;
    usedAt?: Timestamp;
  }>> {
    try {
      logger.debug('getActiveOTPsFromRetailer called', { retailerId, tenantId }, { context: 'OTPService' });
      
      const retailer = await this.getById(retailerId, tenantId);
      logger.debug('Retailer found in getActiveOTPsFromRetailer', retailer ? 'YES' : 'NO', { context: 'OTPService' });
      
      if (!retailer) {
        logger.warn('Retailer not found', { context: 'OTPService' });
        return [];
      }
      
      logger.debug('Retailer activeOTPs array', retailer.activeOTPs ? 'EXISTS' : 'MISSING', { context: 'OTPService' });
      if (!retailer.activeOTPs) {
        logger.warn('Retailer has no activeOTPs array', { context: 'OTPService' });
        return [];
      }

      logger.debug('Total OTPs in retailer document', retailer.activeOTPs.length, { context: 'OTPService' });
      logger.debug('All OTPs in retailer document', retailer.activeOTPs.map(otp => ({
        paymentId: otp.paymentId,
        code: otp.code,
        amount: otp.amount,
        isUsed: otp.isUsed,
        expiresAt: otp.expiresAt.toDate(),
        createdAt: otp.createdAt.toDate()
      })), { context: 'OTPService' });

      const now = new Date();
      logger.debug('Current time for expiration check', now, { context: 'OTPService' });
      
      // Filter out used and expired OTPs
      const activeOTPs = retailer.activeOTPs.filter(otp => {
        // Skip used OTPs
        if (otp.isUsed) {
          logger.debug('Skipping used OTP', otp.paymentId, { context: 'OTPService' });
          return false;
        }
        
        // Skip expired OTPs
        const expiresAt = otp.expiresAt.toDate();
        const isExpired = expiresAt <= now;
        logger.debug(`OTP ${otp.paymentId} expiration check`, {
          expiresAt: expiresAt,
          now: now,
          isExpired: isExpired
        }, { context: 'OTPService' });
        
        if (isExpired) {
          logger.debug('Skipping expired OTP', otp.paymentId, { context: 'OTPService' });
          return false;
        }
        
        logger.debug('Keeping active OTP', otp.paymentId, { context: 'OTPService' });
        return true;
      });

      logger.debug('Active OTPs after filtering', activeOTPs.length, { context: 'OTPService' });
      logger.debug('Active OTPs details', activeOTPs.map(otp => ({
        paymentId: otp.paymentId,
        code: otp.code,
        amount: otp.amount,
        expiresAt: otp.expiresAt.toDate()
      })), { context: 'OTPService' });

      // Sort by creation time (newest first)
      const sortedOTPs = activeOTPs.sort((a, b) => 
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );
      
      logger.success('Returning sorted active OTPs', sortedOTPs.length, { context: 'OTPService' });
      return sortedOTPs;
    } catch (error) {
      logger.error('Error getting active OTPs from retailer', error, { context: 'OTPService' });
      return [];
    }
  }

  async markOTPAsUsedInRetailer(retailerId: string, tenantId: string, paymentId: string): Promise<void> {
    try {
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer || !retailer.activeOTPs) {
        return;
      }

      // Find and mark the OTP as used
      const updatedOTPs = retailer.activeOTPs.map(otp => {
        if (otp.paymentId === paymentId && !otp.isUsed) {
          return {
            ...otp,
            isUsed: true,
            usedAt: Timestamp.now()
          };
        }
        return otp;
      });

      // Update retailer document
      await this.update(retailerId, {
        activeOTPs: updatedOTPs
      }, tenantId);

      logger.success(`OTP marked as used for retailer ${retailerId} payment ${paymentId}`, { context: 'OTPService' });
    } catch (error) {
      logger.error('Error marking OTP as used in retailer', error, { context: 'OTPService' });
      throw error;
    }
  }

  async removeOTPFromRetailer(retailerId: string, tenantId: string, paymentId: string): Promise<void> {
    try {
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer || !retailer.activeOTPs) {
        return;
      }

      // Remove the OTP from the activeOTPs array
      const updatedOTPs = retailer.activeOTPs.filter(otp => otp.paymentId !== paymentId);

      // Update retailer document
      await this.update(retailerId, {
        activeOTPs: updatedOTPs
      }, tenantId);

      logger.success(`OTP completely removed from retailer ${retailerId} payment ${paymentId}`, { context: 'OTPService' });
    } catch (error) {
      logger.error('Error removing OTP from retailer', error, { context: 'OTPService' });
      throw error;
    }
  }

  async cleanupExpiredOTPsInRetailer(retailerId: string, tenantId: string): Promise<void> {
    try {
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer || !retailer.activeOTPs) {
        return;
      }

      const now = new Date();
      
      // Remove expired OTPs older than 1 hour
      const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      
      const cleanedOTPs = retailer.activeOTPs.filter(otp => {
        // Keep non-expired OTPs and recently expired ones (for audit trail)
        const expiresAt = otp.expiresAt.toDate();
        return expiresAt > cutoffTime;
      });

      // Update retailer document if OTPs were removed
      if (cleanedOTPs.length !== retailer.activeOTPs.length) {
        await this.update(retailerId, {
          activeOTPs: cleanedOTPs
        }, tenantId);
        
        logger.success(`Cleaned up ${retailer.activeOTPs.length - cleanedOTPs.length} expired OTPs for retailer ${retailerId}`, { context: 'OTPService' });
      }
    } catch (error) {
      logger.error('Error cleaning up expired OTPs in retailer', error, { context: 'OTPService' });
      // Don't throw error for cleanup operations
    }
  }
}

export class PaymentService extends FirestoreService<Payment> {
  constructor() {
    super(COLLECTIONS.PAYMENTS);
  }

  async initiatePayment(tenantId: string, data: InitiatePaymentForm & { lineWorkerId: string }): Promise<string> {
    const paymentData = {
      retailerId: data.retailerId,
      retailerName: data.retailerName,
      lineWorkerId: data.lineWorkerId,
      totalPaid: data.totalPaid,
      method: data.method,
      state: 'INITIATED',
      evidence: [],
      timeline: {
        initiatedAt: Timestamp.now()
      }
    };

    return this.create(paymentData as unknown as Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>, tenantId);
  }

  async getPaymentsByRetailer(tenantId: string, retailerId: string): Promise<Payment[]> {
    const payments = await this.query(tenantId, [
      where('retailerId', '==', retailerId)
    ]);
    // Sort in memory by initiatedAt (newest first)
    return payments.sort((a, b) => 
      toMillis(b.timeline.initiatedAt) - toMillis(a.timeline.initiatedAt)
    );
  }

  async getPaymentsByLineWorker(tenantId: string, lineWorkerId: string): Promise<Payment[]> {
    const payments = await this.query(tenantId, [
      where('lineWorkerId', '==', lineWorkerId)
    ]);
    // Sort in memory by initiatedAt (newest first)
    return payments.sort((a, b) => 
      toMillis(b.timeline.initiatedAt) - toMillis(a.timeline.initiatedAt)
    );
  }

  async getPaymentsByState(tenantId: string, state: string): Promise<Payment[]> {
    const payments = await this.query(tenantId, [
      where('state', '==', state)
    ]);
    // Sort in memory by initiatedAt (newest first)
    return payments.sort((a, b) => 
      toMillis(b.timeline.initiatedAt) - toMillis(a.timeline.initiatedAt)
    );
  }

  async updatePaymentState(paymentId: string, tenantId: string, state: "INITIATED" | "OTP_SENT" | "OTP_VERIFIED" | "COMPLETED" | "CANCELLED" | "EXPIRED", updates: Partial<Payment> = {}): Promise<void> {
    const payment = await this.getById(paymentId, tenantId);
    if (!payment) return;

    // Merge timeline updates properly
    const updatedTimeline = {
      ...payment.timeline,
      ...updates.timeline
    };

    // If payment is being completed, update retailer computed fields
    if (state === 'COMPLETED' && payment.state !== 'COMPLETED') {
      try {
        const retailerService = new RetailerService();

        // Update retailer computed fields
        const paymentData = {
          id: paymentId,
          totalPaid: payment.totalPaid,
          method: payment.method,
          createdAt: Timestamp.now(),
          state: 'COMPLETED'
        };
        await retailerService.updateForPayment(payment.retailerId, tenantId, paymentData);
      } catch (error) {
        logger.error('Error updating retailer data', error, { context: 'RetailerService' });
        // Don't throw here - we still want to update the payment state
      }
    }

    await this.update(paymentId, {
      state,
      timeline: updatedTimeline,
      ...updates
    }, tenantId);
  }

  // Clean up stuck payments that are in INITIATED state for too long
  async cleanupStuckPayments(tenantId: string, olderThanMinutes: number = 30): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
      const stuckPayments = await this.query(tenantId, [
        where('state', '==', 'INITIATED')
      ]);

      for (const payment of stuckPayments) {
        if (toDate(payment.timeline.initiatedAt) < cutoffTime) {
          logger.debug('Cleaning up stuck payment ${payment.id} initiated at ${toDate(payment.timeline.initiatedAt)}', { context: 'PaymentService' });
          await this.updatePaymentState(payment.id, tenantId, 'CANCELLED', {
            timeline: {
              ...payment.timeline,
              cancelledAt: Timestamp.now()
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up stuck payments', error, { context: 'PaymentService' });
    }
  }

  async addPaymentEvidence(paymentId: string, tenantId: string, evidence: any): Promise<void> {
    const payment = await this.getById(paymentId, tenantId);
    if (payment) {
      await this.update(paymentId, {
        evidence: [...payment.evidence, evidence]
      }, tenantId);
    }
  }
}

export class PaymentEventService extends FirestoreService<PaymentEvent> {
  constructor() {
    super(COLLECTIONS.PAYMENT_EVENTS);
  }

  async logPaymentEvent(tenantId: string, data: Omit<PaymentEvent, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): Promise<string> {
    return this.create({
      ...data,
      at: Timestamp.now()
    } as unknown as Omit<PaymentEvent, 'id' | 'createdAt' | 'updatedAt'>, tenantId);
  }

  async getPaymentEvents(tenantId: string, paymentId: string): Promise<PaymentEvent[]> {
    const events = await this.query(tenantId, [
      where('paymentId', '==', paymentId)
    ]);
    // Sort in memory by timestamp (oldest first)
    return events.sort((a, b) => 
      toMillis(a.at) - toMillis(b.at)
    );
  }
}

export class SubscriptionService extends FirestoreService<Subscription> {
  constructor() {
    super(COLLECTIONS.SUBSCRIPTIONS);
  }

  async createSubscription(tenantId: string, plan: string): Promise<string> {
    return this.create({
      tenantId,
      plan,
      status: 'ACTIVE',
      paymentsThisPeriod: 0,
      limits: {
        maxPayments: 5000,
        maxRetailers: 100,
        maxLineWorkers: 10
      }
    }, tenantId);
  }

  async incrementUsage(tenantId: string, type: 'payments'): Promise<void> {
    const subscription = await this.getByTenantId(tenantId);
    if (subscription) {
      if (type === 'payments') {
        await this.update(subscription.id, {
          paymentsThisPeriod: subscription.paymentsThisPeriod + 1
        }, tenantId);
      }
    }
  }

  async getByTenantId(tenantId: string): Promise<Subscription | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('tenantId', '==', tenantId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Subscription;
      }
      return null;
    } catch (error) {
      logger.error('Error getting subscription by tenant', error, { context: 'SubscriptionService' });
      throw error;
    }
  }
}

// Utility services
export class StorageService {
  static async uploadEvidence(file: File, tenantId: string, paymentId: string): Promise<string> {
    try {
      const storagePath = `evidence/${tenantId}/${paymentId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return storagePath;
    } catch (error) {
      logger.error('Error uploading evidence', error, { context: 'PaymentService' });
      throw error;
    }
  }
}

export class DashboardService {
  static async getWholesalerDashboardStats(tenantId: string): Promise<DashboardStats> {
    try {
      // Get all retailers
      const retailers = await new RetailerService().getAll(tenantId);
      // Since we don't have invoices anymore, outstanding is always 0
      const totalOutstanding = 0;

      // Get all completed payments
      const allPayments = await new PaymentService().query(tenantId, [
        where('state', '==', 'COMPLETED')
      ]);
      
      // Calculate total revenue from all completed payments
      const totalRevenue = allPayments.reduce((sum, payment) => sum + payment.totalPaid, 0);

      // Get today's completed payments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter for today's payments in memory
      const todayPayments = allPayments.filter(payment => {
        if (!payment.timeline.completedAt) return false;
        const completedAt = toDate(payment.timeline.completedAt);
        return completedAt >= today && completedAt < tomorrow;
      });
      const todayCollections = todayPayments.reduce((sum, payment) => sum + payment.totalPaid, 0);

      // Get aging buckets (simplified)
      const agingBuckets = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0
      };

      // Get top line workers (simplified)
      const topLineWorkers = [];

      return {
        totalRevenue,
        todayCollections,
        topLineWorkers
      };
    } catch (error) {
      logger.error('Error getting dashboard stats', error, { context: 'AnalyticsService' });
      throw error;
    }
  }

  static async getLineWorkerPerformance(tenantId: string, startDate: Date, endDate: Date): Promise<LineWorkerPerformance[]> {
    // Implementation for line worker performance report
    return [];
  }

  static async getAreaPerformance(tenantId: string, startDate: Date, endDate: Date): Promise<AreaPerformance[]> {
    // Implementation for area performance report
    return [];
  }

  // Monthly Targets Management
  static async getMonthlyTargets(tenantId: string, year: number): Promise<MonthlyTargets | null> {
    try {
      const targetsRef = collection(db, COLLECTIONS.MONTHLY_TARGETS);
      const q = query(
        targetsRef,
        where('tenantId', '==', tenantId),
        where('year', '==', year)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as MonthlyTargets;
      }
      return null;
    } catch (error) {
      logger.error('Error getting monthly targets', error, { context: 'TargetService' });
      return null;
    }
  }

  static async saveMonthlyTargets(tenantId: string, targets: MonthlyTarget[], year: number): Promise<void> {
    try {
      const existingTargets = await this.getMonthlyTargets(tenantId, year);
      
      const targetsData: Omit<MonthlyTargets, 'id'> = {
        tenantId,
        targets,
        year,
        createdAt: existingTargets?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (existingTargets) {
        // Update existing document
        const targetsRef = doc(db, COLLECTIONS.MONTHLY_TARGETS, existingTargets.id);
        await updateDoc(targetsRef, {
          ...targetsData,
          updatedAt: Timestamp.now()
        });
        logger.success('Monthly targets updated successfully', { context: 'TargetService' });
      } else {
        // Create new document
        await addDoc(collection(db, COLLECTIONS.MONTHLY_TARGETS), targetsData);
        logger.success('Monthly targets created successfully', { context: 'TargetService' });
      }
    } catch (error) {
      logger.error('Error saving monthly targets', error, { context: 'TargetService' });
      throw error;
    }
  }

  static async getMonthlyRevenue(tenantId: string, year: number): Promise<{ month: string; revenue: number }[]> {
    try {
      // Get all completed payments for the year
      const payments = await new PaymentService().query(tenantId, [
        where('state', '==', 'COMPLETED')
      ]);

      // Filter payments for the specified year and group by month
      const monthlyRevenue: { [key: string]: number } = {};
      
      // Initialize all months with 0 revenue
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(month => {
        monthlyRevenue[month] = 0;
      });

      // Sum payments by month
      payments.forEach(payment => {
        if (payment.timeline.completedAt) {
          const completedDate = toDate(payment.timeline.completedAt);
          if (completedDate.getFullYear() === year) {
            const monthIndex = completedDate.getMonth();
            const monthName = months[monthIndex];
            monthlyRevenue[monthName] += payment.totalPaid;
          }
        }
      });

      // Convert to array format
      return months.map(month => ({
        month,
        revenue: monthlyRevenue[month]
      }));
    } catch (error) {
      logger.error('Error getting monthly revenue', error, { context: 'AnalyticsService' });
      return [];
    }
  }
}

export class OTPService extends FirestoreService<OTP> {
  constructor() {
    super(COLLECTIONS.OTPS);
  }

  async createOTP(data: {
    paymentId: string;
    retailerId: string;
    code: string;
    amount: number;
    lineWorkerName: string;
    expiresAt: Timestamp;
  }): Promise<string> {
    return this.create({
      paymentId: data.paymentId,
      retailerId: data.retailerId,
      code: data.code,
      amount: data.amount,
      lineWorkerName: data.lineWorkerName,
      expiresAt: data.expiresAt,
      isUsed: false
    } as unknown as Omit<OTP, 'id' | 'createdAt' | 'updatedAt'>, 'system'); // Use system tenantId for OTPs
  }

  async getActiveOTPsForRetailer(retailerId: string): Promise<OTP[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where('retailerId', '==', retailerId),
        where('isUsed', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const otps: OTP[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        const otp = { id: doc.id, ...doc.data() } as OTP;
        // Check if OTP is still valid (not expired)
        if (toDate(otp.expiresAt) > now) {
          otps.push(otp);
        }
      });
      
      // Sort by creation time (newest first)
      return otps.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    } catch (error) {
      logger.error('Error getting active OTPs for retailer', error, { context: 'OTPService' });
      return [];
    }
  }

  async markOTPAsUsed(otpId: string): Promise<void> {
    try {
      await this.update(otpId, {
        isUsed: true,
        usedAt: Timestamp.now()
      }, 'system');
    } catch (error) {
      logger.error('Error marking OTP as used', error, { context: 'OTPService' });
      throw error;
    }
  }

  async getOTPByPaymentId(paymentId: string): Promise<OTP | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('paymentId', '==', paymentId),
        where('isUsed', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as OTP;
      }
      return null;
    } catch (error) {
      logger.error('Error getting OTP by payment ID', error, { context: 'OTPService' });
      return null;
    }
  }

  async cleanupExpiredOTPs(): Promise<void> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where('expiresAt', '<', Timestamp.fromDate(now))
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      logger.success('Cleaned up ${querySnapshot.size} expired OTPs', { context: 'OTPService' });
    } catch (error) {
      logger.error('Error cleaning up expired OTPs', error, { context: 'OTPService' });
    }
  }
}

// Product Service
export class ProductService extends FirestoreService<ProductData> {
  constructor() {
    super('products');
  }

  async getActiveProducts(tenantId: string): Promise<ProductData[]> {
    return this.query(tenantId, [where('active', '==', true)]);
  }

  async getProductsByCategory(tenantId: string, category: string): Promise<ProductData[]> {
    return this.query(tenantId, [
      where('category', '==', category),
      where('active', '==', true)
    ]);
  }

  async updateStock(productId: string, tenantId: string, quantity: number): Promise<void> {
    const product = await this.getById(productId, tenantId);
    if (product) {
      const newStock = Math.max(0, product.stock + quantity);
      await this.update(productId, { stock: newStock }, tenantId);
    }
  }
}

// Standalone product functions for backward compatibility
export async function getProducts(tenantId: string): Promise<ProductData[]> {
  try {
    const productService = new ProductService();
    return await productService.getAll(tenantId);
  } catch (error) {
    logger.error('Error getting products', error, { context: 'ProductService' });
    throw error;
  }
}

export async function createProduct(tenantId: string, data: Omit<ProductData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const productService = new ProductService();
    // Remove tenantId from data if it exists, since it will be added by the service
    const { tenantId: _, ...productData } = data as any;
    return await productService.create(productData, tenantId);
  } catch (error) {
    logger.error('Error creating product', error, { context: 'ProductService' });
    throw error;
  }
}

export async function updateProduct(productId: string, tenantId: string, data: Partial<ProductData>): Promise<void> {
  try {
    const productService = new ProductService();
    await productService.update(productId, data, tenantId);
  } catch (error) {
    logger.error('Error updating product', error, { context: 'ProductService' });
    throw error;
  }
}

// Export service instances and Firebase utilities
export const tenantService = new TenantService();
export const userService = new UserService();
export const areaService = new AreaService();
export const retailerService = new RetailerService();
// export const invoiceService = new InvoiceService(); // Disabled - invoices removed
export const paymentService = new PaymentService();
export const paymentEventService = new PaymentEventService();
export const subscriptionService = new SubscriptionService();
export const otpService = new OTPService();
export const productService = new ProductService();
export { Timestamp };