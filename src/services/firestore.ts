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
        tenantIds: [tenantId], // Use tenantIds array instead of single tenantId
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
        
        // Check if tenant has access to this document
        let hasAccess = false;
        
        // New way: check tenantIds array
        if (data.tenantIds && Array.isArray(data.tenantIds)) {
          hasAccess = data.tenantIds.includes(tenantId);
        }
        // Backward compatibility: check single tenantId
        else if (data.tenantId) {
          hasAccess = data.tenantId === tenantId;
        }
        
        logger.debug('Tenant access', hasAccess, { context: 'FirestoreService' });
        
        if (hasAccess) {
          logger.debug('Document found and tenant has access', { context: 'FirestoreService' });
          return { id: docSnap.id, ...data } as T;
        } else {
          logger.warn('Tenant does not have access to this document', { context: 'FirestoreService' });
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
      // Query for documents where tenantIds array contains the tenantId
      const q = query(
        collection(db, this.collectionName), 
        where('tenantIds', 'array-contains', tenantId),
        ...constraints
      );
      const querySnapshot = await getDocs(q);
      
      const documents: T[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data() as T;
        
        // For Retailer documents, merge wholesaler-specific data
        if (this.collectionName === COLLECTIONS.RETAILERS && 
            data && 
            (data as any).wholesalerAssignments && 
            (data as any).wholesalerAssignments[tenantId]) {
          
          const retailer = data as any;
          const assignment = retailer.wholesalerAssignments[tenantId];
          
          // Create merged retailer with wholesaler-specific overrides
          const mergedRetailer = {
            ...retailer,
            areaId: assignment.areaId || retailer.areaId,
            zipcodes: (assignment.zipcodes && Array.isArray(assignment.zipcodes) && assignment.zipcodes.length > 0) ? assignment.zipcodes : (retailer.zipcodes || [])
          };
          
          documents.push({ ...mergedRetailer, id: doc.id } as T);
        } else {
          documents.push({ ...data, id: doc.id } as T);
        }
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
      // Use tenantIds array-contains query for consistency
      const q = query(
        collection(db, this.collectionName), 
        where('tenantIds', 'array-contains', tenantId),
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
    try {
      // Direct query to avoid multiple array-contains filters
      const q = query(
        collection(db, this.collectionName), 
        where('tenantId', '==', tenantId),  // Use == instead of array-contains
        where('roles', 'array-contains', role),
        where('active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      const users: User[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        users.push({ id: doc.id, ...doc.data() } as User);
      });
      
      return users;
    } catch (error) {
      logger.error(`Error getting users by role ${role}`, error, { context: 'UserService' });
      throw error;
    }
  }

  async getAllUsersByRole(tenantId: string, role: string): Promise<User[]> {
    try {
      // Direct query to avoid multiple array-contains filters
      const q = query(
        collection(db, this.collectionName), 
        where('tenantId', '==', tenantId),  // Use == instead of array-contains
        where('roles', 'array-contains', role)
      );
      const querySnapshot = await getDocs(q);
      
      const users: User[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        users.push({ id: doc.id, ...doc.data() } as User);
      });
      
      return users;
    } catch (error) {
      logger.error(`Error getting all users by role ${role}`, error, { context: 'UserService' });
      throw error;
    }
  }

  async getLineWorkersForArea(tenantId: string, areaId: string): Promise<User[]> {
    try {
      // Direct query to avoid multiple array-contains filters
      // Use tenantId instead of tenantIds to avoid array-contains conflict
      const q = query(
        collection(db, this.collectionName), 
        where('tenantId', '==', tenantId),  // Use == instead of array-contains
        where('roles', 'array-contains', 'LINE_WORKER'),
        where('active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      const lineWorkers: User[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        lineWorkers.push({ id: doc.id, ...doc.data() } as User);
      });
      
      // Then filter by assigned areas in application code
      const workersForArea = lineWorkers.filter(worker => 
        worker.assignedAreas && worker.assignedAreas.includes(areaId)
      );
      
      return workersForArea;
    } catch (error) {
      logger.error(`Error getting line workers for area ${areaId}`, error, { context: 'UserService' });
      throw error;
    }
  }

  async assignAreasToUser(userId: string, tenantId: string, areaIds: string[]): Promise<void> {
    // Check if any of the areas are already assigned to other line workers
    for (const areaId of areaIds) {
      const existingWorkers = await this.getLineWorkersForArea(tenantId, areaId);
      const otherWorkers = existingWorkers.filter(worker => worker.id !== userId);
      
      if (otherWorkers.length > 0) {
        const workerNames = otherWorkers.map(w => w.displayName || w.email).join(', ');
        throw new Error(`Area "${areaId}" is already assigned to line worker(s): ${workerNames}. Each area can only be assigned to one line worker.`);
      }
    }
    
    // Assign areas to the line worker
    await this.update(userId, { assignedAreas: areaIds }, tenantId);
    
    // Note: Automatic retailer assignment will be handled by the calling code
    // to avoid circular dependencies between UserService and RetailerService
    logger.success(`Assigned areas ${areaIds.join(', ')} to line worker ${userId}`, { context: 'UserService' });
  }

  async assignZipsToUser(userId: string, tenantId: string, zipcodes: string[]): Promise<void> {
    await this.update(userId, { assignedZips: zipcodes }, tenantId);
  }

  /**
   * Manually reassign a retailer to a different line worker (irrespective of area assignments)
   */
  async reassignRetailerToLineWorker(
    retailerId: string, 
    tenantId: string, 
    newLineWorkerId: string
  ): Promise<void> {
    try {
      // Verify the new line worker exists and is active
      const newLineWorker = await this.getById(newLineWorkerId, tenantId);
      if (!newLineWorker || !newLineWorker.roles.includes('LINE_WORKER')) {
        throw new Error('Invalid line worker ID');
      }
      
      // Note: Retailer validation and update will be handled by RetailerService
      // to avoid circular dependencies between UserService and RetailerService
      
      logger.info(`Request to reassign retailer ${retailerId} to line worker ${newLineWorkerId}`, { 
        retailerId, 
        newLineWorkerId, 
        tenantId,
        context: 'UserService' 
      });
      
    } catch (error) {
      logger.error('Error in reassignRetailerToLineWorker validation', error, { context: 'UserService' });
      throw error;
    }
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
    return this.getAll(tenantId, [where('active', '==', true)]);
  }

  async getAreasByZipcode(tenantId: string, zipcode: string): Promise<Area[]> {
    return this.getAll(tenantId, [
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
    try {
      // First check if retailer with same phone number already exists
      console.log('🔍 Checking if retailer already exists with phone:', data.phone);
      const existingRetailer = await this.getRetailerByPhone(data.phone);
      
      if (existingRetailer) {
        console.log('✅ Found existing retailer, adding tenant to it:', existingRetailer.id);
        
        // Check if this tenant is already associated
        if (existingRetailer.tenantIds && existingRetailer.tenantIds.includes(tenantId)) {
          console.log('ℹ️ Tenant already associated with this retailer');
          // Update wholesaler data anyway in case area changed
          await this.upsertWholesalerData(existingRetailer.id, tenantId, {
            areaId: data.areaId,
            zipcodes: data.zipcodes
          });
          return existingRetailer.id;
        }
        
        // Add tenant to existing retailer
        await this.addTenantToRetailer(existingRetailer.id, tenantId);
        
        // Add wholesaler-specific data using NEW method
        await this.upsertWholesalerData(existingRetailer.id, tenantId, {
          areaId: data.areaId,
          zipcodes: data.zipcodes
        });
        
        // Create retailer user account for this tenant if it doesn't exist
        try {
          const retailerDataForTenant = {
            ...existingRetailer,
            tenantIds: [...(existingRetailer.tenantIds || []), tenantId]
          };
          await RetailerAuthService.createRetailerUser(retailerDataForTenant, tenantId);
          logger.success('Retailer user account created for existing retailer', data.phone, { context: 'RetailerService' });
        } catch (error) {
          logger.error('Error creating retailer user account for existing retailer', error, { context: 'RetailerService' });
          // Don't throw here - the retailer was added successfully
        }
        
        return existingRetailer.id;
      }
      
      // Create new retailer document only if no existing retailer found
      console.log('🆕 Creating new retailer document for:', data.phone);
      const retailerId = await this.create({
        name: data.name,
        phone: data.phone,
        address: data.address,
        areaId: data.areaId,
        zipcodes: data.zipcodes,
        // FIX: Populate profile immediately so UI can display retailer data correctly
        profile: {
          realName: data.name,
          phone: data.phone,
          address: data.address || '',
          email: '',
          businessType: '',
          licenseNumber: ''
        },
        // FIX: Set verification status to verified since wholesaler is creating account
        verification: {
          isPhoneVerified: true,
          verificationMethod: 'MANUAL'
        },
        // NEW: Use wholesalerData instead of wholesalerAssignments
        wholesalerData: {
          [tenantId]: {
            currentAreaId: data.areaId || '',
            currentZipcodes: data.zipcodes || [],
            assignedAt: Timestamp.now(),
            areaAssignmentHistory: [{
              areaId: data.areaId || '',
              zipcodes: data.zipcodes || [],
              assignedAt: Timestamp.now(),
              isActive: true
            }],
            notes: '',
            creditLimit: 0,
            currentBalance: 0
          }
        },
        // Keep wholesalerAssignments for backward compatibility during transition
        wholesalerAssignments: {
          [tenantId]: {
            areaId: data.areaId,
            zipcodes: data.zipcodes,
            assignedAt: Timestamp.now()
          }
        }
      } as Omit<Retailer, 'id' | 'createdAt' | 'updatedAt'>, tenantId);

      // Create retailer user account for login
      try {
        const retailerData: Retailer = {
          id: retailerId,
          tenantIds: [tenantId], // Use tenantIds array
          name: data.name,
          phone: data.phone,
          address: data.address,
          areaId: data.areaId,
          zipcodes: data.zipcodes,
          // FIX: Include profile for consistency
          profile: {
            realName: data.name,
            phone: data.phone,
            address: data.address || '',
            email: '',
            businessType: '',
            licenseNumber: ''
          },
          // FIX: Include verification for consistency
          verification: {
            isPhoneVerified: true,
            verificationMethod: 'MANUAL'
          },
          // NEW: Use wholesalerData
          wholesalerData: {
            [tenantId]: {
              currentAreaId: data.areaId || '',
              currentZipcodes: data.zipcodes || [],
              assignedAt: Timestamp.now(),
              areaAssignmentHistory: [{
                areaId: data.areaId || '',
                zipcodes: data.zipcodes || [],
                assignedAt: Timestamp.now(),
                isActive: true
              }],
              notes: '',
              creditLimit: 0,
              currentBalance: 0
            }
          },
          // Keep wholesalerAssignments for backward compatibility
          wholesalerAssignments: {
            [tenantId]: {
              areaId: data.areaId,
              zipcodes: data.zipcodes,
              assignedAt: Timestamp.now()
            }
          },
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
    } catch (error) {
      logger.error('Error in createRetailer', error, { context: 'RetailerService' });
      throw error;
    }
  }

  async getRetailersByArea(tenantId: string, areaId: string): Promise<Retailer[]> {
    return this.query(tenantId, [where('areaId', '==', areaId)]);
  }

  async getRetailersByZipcode(tenantId: string, zipcode: string): Promise<Retailer[]> {
    try {
      // Direct query to avoid multiple array-contains filters
      const q = query(
        collection(db, this.collectionName), 
        where('tenantId', '==', tenantId),  // Use == instead of array-contains
        where('zipcodes', 'array-contains', zipcode)
      );
      const querySnapshot = await getDocs(q);
      
      const retailers: Retailer[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        retailers.push({ id: doc.id, ...doc.data() } as Retailer);
      });
      
      return retailers;
    } catch (error) {
      logger.error(`Error getting retailers by zipcode ${zipcode}`, error, { context: 'RetailerService' });
      throw error;
    }
  }

  // New multi-tenant methods
  
  /**
   * Find retailer by phone number across all tenants
   * ENHANCED: Prefers retailer document that's referenced by retailerUsers for consistency
   */
  async getRetailerByPhone(phone: string): Promise<Retailer | null> {
    try {
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // If only one retailer found, return it
      if (querySnapshot.docs.length === 1) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Retailer;
      }
      
      // CRITICAL FIX: Multiple retailers found with same phone - find the correct one
      console.log(`⚠️  Multiple retailers (${querySnapshot.docs.length}) found with phone ${phone}`);
      
      // Get retailerUsers reference to find the correct retailer ID
      const retailerUsersRef = collection(db, 'retailerUsers');
      const userQuery = query(retailerUsersRef, where('phone', '==', phone));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const retailerUser = userSnapshot.docs[0].data();
        const preferredRetailerId = retailerUser.retailerId;
        
        console.log(`📋 retailerUsers references retailer ID: ${preferredRetailerId}`);
        
        // Try to find the retailer document that matches retailerUsers.retailerId
        const preferredDoc = querySnapshot.docs.find(doc => doc.id === preferredRetailerId);
        
        if (preferredDoc) {
          console.log(`✅ Found preferred retailer document: ${preferredDoc.id}`);
          return { id: preferredDoc.id, ...preferredDoc.data() } as Retailer;
        } else {
          console.log(`⚠️  retailerUsers references non-existent retailer, using first match`);
        }
      } else {
        console.log(`⚠️  No retailerUsers found, using first retailer match`);
      }
      
      // Fallback to first document
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Retailer;
      
    } catch (error) {
      logger.error('Error finding retailer by phone', error, { context: 'RetailerService' });
      return null;
    }
  }

  /**
   * Enhanced retailer lookup that checks both legacy phone field and new profile.phone field
   */
  async getRetailerByPhoneEnhanced(phone: string): Promise<Retailer | null> {
    try {
      console.log(`🔍 Enhanced retailer search for phone: ${phone}`);
      
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      
      // First try the legacy phone field
      console.log('📋 Checking legacy phone field...');
      const legacyQuery = query(retailersRef, where('phone', '==', phone));
      const legacySnapshot = await getDocs(legacyQuery);
      
      if (!legacySnapshot.empty) {
        console.log(`✅ Found ${legacySnapshot.docs.length} retailer(s) with legacy phone field`);
        
        // If multiple, use retailerUsers to find the correct one
        if (legacySnapshot.docs.length > 1) {
          console.log('⚠️  Multiple retailers found, checking retailerUsers for correct reference...');
          
          const retailerUsersRef = collection(db, 'retailerUsers');
          const userQuery = query(retailerUsersRef, where('phone', '==', phone));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const retailerUser = userSnapshot.docs[0].data();
            const preferredRetailerId = retailerUser.retailerId;
            
            console.log(`📋 retailerUsers references retailer ID: ${preferredRetailerId}`);
            
            const preferredDoc = legacySnapshot.docs.find(doc => doc.id === preferredRetailerId);
            if (preferredDoc) {
              console.log(`✅ Using preferred retailer: ${preferredDoc.id}`);
              return { id: preferredDoc.id, ...preferredDoc.data() } as Retailer;
            }
          }
        }
        
        // Return first (or only) match
        const doc = legacySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Retailer;
      }
      
      // If not found in legacy field, check the new profile.phone field
      console.log('📋 Checking profile.phone field...');
      const profileQuery = query(retailersRef, where('profile.phone', '==', phone));
      const profileSnapshot = await getDocs(profileQuery);
      
      if (!profileSnapshot.empty) {
        console.log(`✅ Found ${profileSnapshot.docs.length} retailer(s) with profile.phone field`);
        
        // If multiple, use retailerUsers to find the correct one
        if (profileSnapshot.docs.length > 1) {
          console.log('⚠️  Multiple retailers found, checking retailerUsers for correct reference...');
          
          const retailerUsersRef = collection(db, 'retailerUsers');
          const userQuery = query(retailerUsersRef, where('phone', '==', phone));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const retailerUser = userSnapshot.docs[0].data();
            const preferredRetailerId = retailerUser.retailerId;
            
            console.log(`📋 retailerUsers references retailer ID: ${preferredRetailerId}`);
            
            const preferredDoc = profileSnapshot.docs.find(doc => doc.id === preferredRetailerId);
            if (preferredDoc) {
              console.log(`✅ Using preferred retailer: ${preferredDoc.id}`);
              return { id: preferredDoc.id, ...preferredDoc.data() } as Retailer;
            }
          }
        }
        
        // Return first (or only) match
        const doc = profileSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Retailer;
      }
      
      console.log('❌ No retailer found with this phone number');
      
      // Final fallback: try direct document lookup by ID pattern
      const potentialId = `retailer_${phone}`;
      console.log(`🔍 Trying direct document lookup with ID: ${potentialId}`);
      
      const directDoc = await getDoc(doc(db, COLLECTIONS.RETAILERS, potentialId));
      if (directDoc.exists()) {
        console.log(`✅ Found retailer via direct ID lookup: ${potentialId}`);
        return { id: directDoc.id, ...directDoc.data() } as Retailer;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Error in enhanced retailer phone search', error, { context: 'RetailerService' });
      return null;
    }
  }

  /**
   * Add tenant to existing retailer's tenantIds array
   */
  async addTenantToRetailer(retailerId: string, tenantId: string): Promise<void> {
    try {
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer not found');
      }
      
      const retailerData = retailerDoc.data();
      const currentTenantIds = retailerData.tenantIds || [];
      
      // Check if tenant already exists
      if (currentTenantIds.includes(tenantId)) {
        logger.info(`Tenant ${tenantId} already associated with retailer ${retailerId}`, { context: 'RetailerService' });
        return;
      }
      
      // Add new tenant to array
      const updatedTenantIds = [...currentTenantIds, tenantId];
      
      // Preserve existing wholesalerAssignments and wholesalerData
      const updateData: any = {
        tenantIds: updatedTenantIds,
        updatedAt: Timestamp.now()
      };
      
      // Only preserve wholesalerAssignments if it exists
      if (retailerData.wholesalerAssignments) {
        updateData.wholesalerAssignments = retailerData.wholesalerAssignments;
      }
      
      // Only preserve wholesalerData if it exists
      if (retailerData.wholesalerData) {
        updateData.wholesalerData = retailerData.wholesalerData;
      }
      
      await updateDoc(retailerRef, updateData);
      
      logger.success(`Added tenant ${tenantId} to retailer ${retailerId}`, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error adding tenant to retailer', error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Remove tenant from retailer's tenantIds array (soft removal - keeps historical data)
   */
  async removeTenantFromRetailer(retailerId: string, tenantId: string): Promise<void> {
    try {
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer not found');
      }
      
      const retailerData = retailerDoc.data();
      const currentTenantIds = retailerData.tenantIds || [];
      
      // Remove tenant from array
      const updatedTenantIds = currentTenantIds.filter((id: string) => id !== tenantId);
      
      // Preserve existing wholesalerAssignments and wholesalerData but remove this tenant's data
      const updateData: any = {
        tenantIds: updatedTenantIds,
        updatedAt: Timestamp.now()
      };
      
      // Handle wholesalerAssignments - remove this tenant's assignment but preserve others
      if (retailerData.wholesalerAssignments) {
        const updatedAssignments = { ...retailerData.wholesalerAssignments };
        delete updatedAssignments[tenantId];
        updateData.wholesalerAssignments = updatedAssignments;
      }
      
      // Handle wholesalerData - remove this tenant's data but preserve others
      if (retailerData.wholesalerData) {
        const updatedWholesalerData = { ...retailerData.wholesalerData };
        delete updatedWholesalerData[tenantId];
        updateData.wholesalerData = updatedWholesalerData;
      }
      
      await updateDoc(retailerRef, updateData);
      
      logger.success(`Removed tenant ${tenantId} from retailer ${retailerId}`, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error removing tenant from retailer', error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Override delete method for retailers - soft delete that only removes tenant association
   * This preserves the retailer document and all historical transaction data
   */
  async delete(retailerId: string, tenantId: string): Promise<void> {
    try {
      console.log(`🗑️  Soft removing retailer ${retailerId} from tenant ${tenantId}`);
      
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer not found');
      }
      
      const retailerData = retailerDoc.data();
      const currentTenantIds = retailerData.tenantIds || [];
      
      // Check if retailer is associated with this tenant
      if (!currentTenantIds.includes(tenantId)) {
        console.log(`ℹ️  Retailer ${retailerId} is not associated with tenant ${tenantId}`);
        return;
      }
      
      // Remove tenant from tenantIds array
      const updatedTenantIds = currentTenantIds.filter((id: string) => id !== tenantId);
      
      // Remove wholesaler-specific data for this tenant
      let wholesalerData = retailerData.wholesalerData || {};
      let wholesalerAssignments = retailerData.wholesalerAssignments || {};
      
      delete wholesalerData[tenantId];
      delete wholesalerAssignments[tenantId];
      
      // Clear assigned line worker for this tenant if this was the last tenant
      let updateData: any = {
        tenantIds: updatedTenantIds,
        wholesalerData: wholesalerData,
        wholesalerAssignments: wholesalerAssignments,
        updatedAt: Timestamp.now()
      };
      
      // If no more tenants associated, clear the assigned line worker
      if (updatedTenantIds.length === 0) {
        updateData.assignedLineWorkerId = null;
        console.log(`🔧 Cleared assigned line worker for retailer ${retailerId} - no more tenant associations`);
      }
      
      await updateDoc(retailerRef, updateData);
      
      logger.success(`Soft removed retailer ${retailerId} from tenant ${tenantId} - document preserved`, { context: 'RetailerService' });
      console.log(`✅ Retailer ${retailerId} disassociated from tenant ${tenantId}, historical data preserved`);
      
    } catch (error) {
      logger.error('Error soft removing retailer from tenant', error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Get all retailers for a specific tenant (from tenantIds array)
   */
  async getRetailersForTenant(tenantId: string): Promise<Retailer[]> {
    try {
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const q = query(retailersRef, where('tenantIds', 'array-contains', tenantId));
      const querySnapshot = await getDocs(q);
      
      const retailers: Retailer[] = [];
      querySnapshot.forEach((doc) => {
        retailers.push({ id: doc.id, ...doc.data() } as Retailer);
      });
      
      return retailers;
    } catch (error) {
      logger.error('Error getting retailers for tenant', error, { context: 'RetailerService' });
      return [];
    }
  }

  /**
   * Update wholesaler-specific assignment for a retailer
   */
  async updateWholesalerAssignment(retailerId: string, tenantId: string, areaId?: string, zipcodes?: string[]): Promise<void> {
    try {
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer not found');
      }
      
      const retailerData = retailerDoc.data();
      const currentAssignments = retailerData.wholesalerAssignments || {};
      const currentWholesalerData = retailerData.wholesalerData || {};
      
      // Update or add the wholesaler's assignment in wholesalerAssignments (backward compatibility)
      const updatedAssignments = {
        ...currentAssignments,
        [tenantId]: {
          areaId: areaId || undefined,
          zipcodes: zipcodes || [],
          assignedAt: Timestamp.now()
        }
      };
      
      // Also update wholesalerData (preferred method)
      const existingData = currentWholesalerData[tenantId];
      const updatedWholesalerData = {
        ...currentWholesalerData,
        [tenantId]: {
          currentAreaId: areaId || '',
          currentZipcodes: zipcodes || [],
          assignedAt: existingData?.assignedAt || Timestamp.now(),
          areaAssignmentHistory: existingData?.areaAssignmentHistory || [],
          notes: existingData?.notes || '',
          creditLimit: existingData?.creditLimit || 0,
          currentBalance: existingData?.currentBalance || 0
        }
      };
      
      // Update area assignment history if area changed
      if (areaId && areaId !== existingData?.currentAreaId) {
        const history = updatedWholesalerData[tenantId].areaAssignmentHistory;
        // Mark previous assignments as inactive
        const updatedHistory = history.map((h: any) => ({ ...h, isActive: false }));
        // Add new assignment
        updatedHistory.push({
          areaId: areaId,
          zipcodes: zipcodes || [],
          assignedAt: Timestamp.now(),
          isActive: true
        });
        updatedWholesalerData[tenantId].areaAssignmentHistory = updatedHistory;
      }
      
      await updateDoc(retailerRef, {
        wholesalerAssignments: updatedAssignments,
        wholesalerData: updatedWholesalerData,
        updatedAt: Timestamp.now()
      });
      
      logger.success(`Updated wholesaler assignment for retailer ${retailerId}, tenant ${tenantId}`, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error updating wholesaler assignment', error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Get wholesaler-specific assignment for a retailer
   */
  async getWholesalerAssignment(retailerId: string, tenantId: string): Promise<{
    areaId?: string;
    zipcodes: string[];
    assignedAt: Timestamp;
  } | null> {
    try {
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer || !retailer.wholesalerAssignments) {
        return null;
      }
      
      return retailer.wholesalerAssignments[tenantId] || null;
    } catch (error) {
      logger.error('Error getting wholesaler assignment', error, { context: 'RetailerService' });
      return null;
    }
  }

  /**
   * Migration function: Convert existing retailers with single tenantId to tenantIds array
   */
  async migrateRetailersToMultiTenant(): Promise<{ migrated: number; errors: number }> {
    try {
      logger.info('Starting retailer migration to multi-tenant structure', { context: 'RetailerService' });
      
      const retailersRef = collection(db, COLLECTIONS.RETAILERS);
      const querySnapshot = await getDocs(retailersRef);
      
      let migrated = 0;
      let errors = 0;
      
      for (const doc of querySnapshot.docs) {
        try {
          const retailerData = doc.data();
          
          // Skip if already migrated
          if (retailerData.tenantIds && Array.isArray(retailerData.tenantIds)) {
            continue;
          }
          
          // Migrate single tenantId to array
          if (retailerData.tenantId) {
            await updateDoc(doc.ref, {
              tenantIds: [retailerData.tenantId],
              updatedAt: Timestamp.now()
            });
            migrated++;
            logger.debug(`Migrated retailer ${doc.id} to multi-tenant`, { context: 'RetailerService' });
          }
        } catch (error) {
          errors++;
          logger.error(`Error migrating retailer ${doc.id}`, error, { context: 'RetailerService' });
        }
      }
      
      logger.info(`Retailer migration completed: ${migrated} migrated, ${errors} errors`, { context: 'RetailerService' });
      return { migrated, errors };
    } catch (error) {
      logger.error('Error during retailer migration', error, { context: 'RetailerService' });
      return { migrated: 0, errors: 1 };
    }
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
      
      // CRITICAL FIX: Preserve wholesaler data while updating payment fields
      const updateData: any = {
        totalPaidAmount: newTotalPaidAmount,
        totalPaymentsCount: newTotalPaymentsCount,
        lastPaymentDate: payment.createdAt,
        recentPayments: updatedRecentPayments,
        computedAt: Timestamp.now(),
        // Preserve existing wholesaler assignments and data
        wholesalerAssignments: retailer.wholesalerAssignments || {},
        wholesalerData: retailer.wholesalerData || {},
        // Preserve all other critical fields
        tenantIds: retailer.tenantIds || [],
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address,
        areaId: retailer.areaId,
        zipcodes: retailer.zipcodes,
        active: retailer.active !== false, // Default to true if not set
        lastPaymentDate: retailer.lastPaymentDate || null
      };

      // Only add profile and verification if they exist (avoid creating empty objects)
      if (retailer.profile) {
        updateData.profile = retailer.profile;
      }
      if (retailer.verification) {
        updateData.verification = retailer.verification;
      }
      
      await this.update(retailerId, updateData, tenantId);
      
      logger.success(`Updated retailer ${retailerId} for payment: +₹${payment.totalPaid} (wholesaler data preserved)`, { context: 'RetailerService' });
    }
  }

  // Recompute all retailer data from scratch (for data correction/migration)
  async recomputeRetailerData(retailerId: string, tenantId: string): Promise<void> {
    try {
      logger.debug(`Recomputing data for retailer ${retailerId}`, { context: 'RetailerService' });
      
      // CRITICAL FIX: Get retailer data first before using it
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer) {
        logger.error(`Retailer ${retailerId} not found for recompute`, { context: 'RetailerService' });
        return;
      }
      
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
      const updateData: any = {
        totalPaidAmount,
        totalPaymentsCount: payments.filter(p => p.state === 'COMPLETED').length,
        lastPaymentDate: lastPaymentDate || undefined,
        recentPayments,
        computedAt: Timestamp.now(),
        // CRITICAL FIX: Preserve wholesaler assignments and data
        wholesalerAssignments: retailer.wholesalerAssignments || {},
        wholesalerData: retailer.wholesalerData || {},
        // Preserve all other critical fields
        tenantIds: retailer.tenantIds || [],
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address,
        areaId: retailer.areaId,
        zipcodes: retailer.zipcodes,
        active: retailer.active !== false
      };

      // Only add profile and verification if they exist (avoid creating empty objects)
      if (retailer.profile) {
        updateData.profile = retailer.profile;
      }
      if (retailer.verification) {
        updateData.verification = retailer.verification;
      }
      
      await this.update(retailerId, updateData, tenantId);
      
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
      
      // CRITICAL FIX: Preserve all existing data while updating OTPs
      const updateData: any = {
        activeOTPs,
        // Preserve existing wholesaler assignments and data
        wholesalerAssignments: retailer.wholesalerAssignments || {},
        wholesalerData: retailer.wholesalerData || {},
        // Preserve all other critical fields
        tenantIds: retailer.tenantIds || [],
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address,
        areaId: retailer.areaId,
        zipcodes: retailer.zipcodes,
        active: retailer.active !== false,
        // Preserve payment-related fields
        totalPaidAmount: retailer.totalPaidAmount || 0,
        totalPaymentsCount: retailer.totalPaymentsCount || 0,
        lastPaymentDate: retailer.lastPaymentDate || null,
        recentPayments: retailer.recentPayments || [],
        computedAt: retailer.computedAt || Timestamp.now()
      };

      // Only add profile and verification if they exist (avoid creating empty objects)
      if (retailer.profile) {
        updateData.profile = retailer.profile;
      }
      if (retailer.verification) {
        updateData.verification = retailer.verification;
      }
      
      await this.update(retailerId, updateData, tenantId);

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
      // CRITICAL FIX: Preserve all existing data while updating OTPs
      const updateData: any = {
        activeOTPs: updatedOTPs,
        // Preserve existing wholesaler assignments and data
        wholesalerAssignments: retailer.wholesalerAssignments || {},
        wholesalerData: retailer.wholesalerData || {},
        // Preserve all other critical fields
        tenantIds: retailer.tenantIds || [],
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address,
        areaId: retailer.areaId,
        zipcodes: retailer.zipcodes,
        active: retailer.active !== false,
        // Preserve payment-related fields
        totalPaidAmount: retailer.totalPaidAmount || 0,
        totalPaymentsCount: retailer.totalPaymentsCount || 0,
        lastPaymentDate: retailer.lastPaymentDate || null,
        recentPayments: retailer.recentPayments || [],
        computedAt: retailer.computedAt || Timestamp.now()
      };

      // Only add profile and verification if they exist (avoid creating empty objects)
      if (retailer.profile) {
        updateData.profile = retailer.profile;
      }
      if (retailer.verification) {
        updateData.verification = retailer.verification;
      }

      await this.update(retailerId, updateData, tenantId);

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
      // CRITICAL FIX: Preserve all existing data while updating OTPs
      const updateData: any = {
        activeOTPs: updatedOTPs,
        // Preserve existing wholesaler assignments and data
        wholesalerAssignments: retailer.wholesalerAssignments || {},
        wholesalerData: retailer.wholesalerData || {},
        // Preserve all other critical fields
        tenantIds: retailer.tenantIds || [],
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address,
        areaId: retailer.areaId,
        zipcodes: retailer.zipcodes,
        active: retailer.active !== false,
        // Preserve payment-related fields
        totalPaidAmount: retailer.totalPaidAmount || 0,
        totalPaymentsCount: retailer.totalPaymentsCount || 0,
        lastPaymentDate: retailer.lastPaymentDate || null,
        recentPayments: retailer.recentPayments || [],
        computedAt: retailer.computedAt || Timestamp.now()
      };

      // Only add profile and verification if they exist (avoid creating empty objects)
      if (retailer.profile) {
        updateData.profile = retailer.profile;
      }
      if (retailer.verification) {
        updateData.verification = retailer.verification;
      }

      await this.update(retailerId, updateData, tenantId);

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

  // NEW WHOLESALER DATA METHODS

  /**
   * Add or update wholesaler data for a retailer (NEW METHOD)
   */
  async upsertWholesalerData(
    retailerId: string, 
    tenantId: string, 
    data: {
      areaId?: string;
      zipcodes?: string[];
      notes?: string;
      creditLimit?: number;
      currentBalance?: number;
    }
  ): Promise<void> {
    try {
      const retailerRef = doc(db, COLLECTIONS.RETAILERS, retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        throw new Error('Retailer not found');
      }
      
      const retailerData = retailerDoc.data();
      let wholesalerData = retailerData.wholesalerData || {};
      
      const now = Timestamp.now();
      const existingData = wholesalerData[tenantId];
      
      // Prepare the updated wholesaler data
      const updatedWholesalerData = {
        currentAreaId: data.areaId || existingData?.currentAreaId || '',
        currentZipcodes: data.zipcodes || existingData?.currentZipcodes || [],
        assignedAt: existingData?.assignedAt || now,
        areaAssignmentHistory: existingData?.areaAssignmentHistory || [],
        notes: data.notes !== undefined ? data.notes : (existingData?.notes || ''),
        creditLimit: data.creditLimit !== undefined ? data.creditLimit : (existingData?.creditLimit || 0),
        currentBalance: data.currentBalance !== undefined ? data.currentBalance : (existingData?.currentBalance || 0)
      };
      
      // Update area assignment history if area changed
      if (data.areaId && data.areaId !== existingData?.currentAreaId) {
        // Mark previous assignment as inactive
        updatedWholesalerData.areaAssignmentHistory = updatedWholesalerData.areaAssignmentHistory.map(history => ({
          ...history,
          isActive: false
        }));
        
        // Add new assignment
        updatedWholesalerData.areaAssignmentHistory.push({
          areaId: data.areaId,
          zipcodes: data.zipcodes || [],
          assignedAt: now,
          isActive: true
        });
      }
      
      // Update the wholesaler data
      wholesalerData[tenantId] = updatedWholesalerData;
      
      // Also update wholesalerAssignments for backward compatibility
      let wholesalerAssignments = retailerData.wholesalerAssignments || {};
      wholesalerAssignments[tenantId] = {
        areaId: updatedWholesalerData.currentAreaId,
        zipcodes: updatedWholesalerData.currentZipcodes,
        assignedAt: updatedWholesalerData.assignedAt
      };
      
      await updateDoc(retailerRef, {
        wholesalerData: wholesalerData,
        wholesalerAssignments: wholesalerAssignments,
        updatedAt: now
      });
      
      logger.success(`Updated wholesaler data for retailer ${retailerId}, tenant ${tenantId}`, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error updating wholesaler data', error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Get wholesaler-specific data for a retailer (NEW METHOD)
   */
  async getWholesalerData(retailerId: string, tenantId: string): Promise<any | null> {
    try {
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer || !retailer.wholesalerData) {
        return null;
      }
      
      return retailer.wholesalerData[tenantId] || null;
    } catch (error) {
      logger.error('Error getting wholesaler data', error, { context: 'RetailerService' });
      return null;
    }
  }

  /**
   * Get retailer with wholesaler-specific data merged (UPDATED METHOD)
   */
  async getRetailerForTenant(retailerId: string, tenantId: string): Promise<Retailer | null> {
    try {
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer) {
        return null;
      }
      
      // NEW: Prefer wholesalerData over wholesalerAssignments
      if (retailer.wholesalerData && retailer.wholesalerData[tenantId]) {
        const wholesalerSpecificData = retailer.wholesalerData[tenantId];
        const mergedRetailer = {
          ...retailer,
          // Override with wholesaler-specific data
          areaId: wholesalerSpecificData.currentAreaId || retailer.areaId,
          zipcodes: (wholesalerSpecificData.currentZipcodes && Array.isArray(wholesalerSpecificData.currentZipcodes) && wholesalerSpecificData.currentZipcodes.length > 0) ? wholesalerSpecificData.currentZipcodes : (retailer.zipcodes || [])
          // Note: notes, creditLimit, currentBalance are stored in wholesalerData but not part of base Retailer interface
        };
        
        return mergedRetailer;
      }
      
      // BACKWARD COMPATIBILITY: Fall back to wholesalerAssignments
      if (retailer.wholesalerAssignments && retailer.wholesalerAssignments[tenantId]) {
        const assignment = retailer.wholesalerAssignments[tenantId];
        const mergedRetailer = {
          ...retailer,
          // Override with wholesaler-specific data
          areaId: assignment.areaId || retailer.areaId,
          zipcodes: (assignment.zipcodes && Array.isArray(assignment.zipcodes) && assignment.zipcodes.length > 0) ? assignment.zipcodes : (retailer.zipcodes || [])
        };
        
        return mergedRetailer;
      }
      
      return retailer;
    } catch (error) {
      logger.error('Error getting retailer for tenant', error, { context: 'RetailerService' });
      return null;
    }
  }

  /**
   * Update the getAll method to use new wholesalerData structure (OVERRIDE)
   */
  async getAll(tenantId: string, constraints: QueryConstraint[] = []): Promise<Retailer[]> {
    try {
      // Query for documents where tenantIds array contains the tenantId
      const q = query(
        collection(db, this.collectionName), 
        where('tenantIds', 'array-contains', tenantId),
        ...constraints
      );
      const querySnapshot = await getDocs(q);
      
      const documents: Retailer[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data() as Retailer;
        
        // For Retailer documents, merge wholesaler-specific data
        if (data && data.wholesalerData && data.wholesalerData[tenantId]) {
          const retailer = data as any;
          const wholesalerSpecificData = retailer.wholesalerData[tenantId];
          
          // Create merged retailer with wholesaler-specific overrides
          const mergedRetailer = {
            ...retailer,
            areaId: wholesalerSpecificData.currentAreaId || retailer.areaId,
            zipcodes: (wholesalerSpecificData.currentZipcodes && Array.isArray(wholesalerSpecificData.currentZipcodes) && wholesalerSpecificData.currentZipcodes.length > 0) ? wholesalerSpecificData.currentZipcodes : (retailer.zipcodes || []),
            notes: wholesalerSpecificData.notes,
            creditLimit: wholesalerSpecificData.creditLimit,
            currentBalance: wholesalerSpecificData.currentBalance
          };
          
          documents.push({ id: doc.id, ...mergedRetailer } as Retailer);
        } 
        // BACKWARD COMPATIBILITY: Fall back to wholesalerAssignments
        else if (data && data.wholesalerAssignments && data.wholesalerAssignments[tenantId]) {
          const retailer = data as any;
          const assignment = retailer.wholesalerAssignments[tenantId];
          
          // Create merged retailer with wholesaler-specific overrides
          const mergedRetailer = {
            ...retailer,
            areaId: assignment.areaId || retailer.areaId,
            zipcodes: (assignment.zipcodes && Array.isArray(assignment.zipcodes) && assignment.zipcodes.length > 0) ? assignment.zipcodes : (retailer.zipcodes || [])
          };
          
          documents.push({ ...mergedRetailer, id: doc.id } as Retailer);
        } else {
          documents.push({ ...data, id: doc.id } as Retailer);
        }
      });
      
      return documents;
    } catch (error) {
      logger.error(`Error getting documents from ${this.collectionName}`, error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Assign retailers in specific areas to a line worker
   */
  async assignRetailersInAreasToLineWorker(
    tenantId: string, 
    areaIds: string[], 
    lineWorkerId: string
  ): Promise<void> {
    try {
      const retailers = await this.getAll(tenantId);
      
      for (const retailer of retailers) {
        // Check if retailer belongs to any of the assigned areas
        const retailerAreaId = retailer.areaId; // This will be merged with wholesaler-specific data
        const belongsToArea = retailerAreaId ? areaIds.includes(retailerAreaId) : false;
        
        if (belongsToArea) {
          // Update retailer's assigned line worker
          await this.update(retailer.id, {
            assignedLineWorkerId: lineWorkerId
          }, tenantId);
          
          logger.info(`Automatically assigned retailer ${retailer.name} (${retailer.id}) to line worker ${lineWorkerId} for area ${retailerAreaId}`, { context: 'RetailerService' });
        }
      }
      
      logger.success(`Assigned retailers in areas ${areaIds.join(', ')} to line worker ${lineWorkerId}`, { context: 'RetailerService' });
    } catch (error) {
      logger.error('Error automatically assigning retailers to line worker', error, { context: 'RetailerService' });
      throw error;
    }
  }

  /**
   * Manually reassign a retailer to a different line worker
   */
  async reassignRetailerToLineWorker(
    retailerId: string, 
    tenantId: string, 
    newLineWorkerId: string
  ): Promise<void> {
    try {
      // Get current retailer data
      const retailer = await this.getById(retailerId, tenantId);
      if (!retailer) {
        throw new Error('Retailer not found');
      }
      
      const previousLineWorkerId = retailer.assignedLineWorkerId;
      
      // Update retailer assignment
      await this.update(retailerId, {
        assignedLineWorkerId: newLineWorkerId
      }, tenantId);
      
      logger.info(`Manually reassigned retailer ${retailer.name} from line worker ${previousLineWorkerId} to ${newLineWorkerId}`, { 
        retailerId, 
        previousLineWorkerId, 
        newLineWorkerId, 
        tenantId,
        context: 'RetailerService' 
      });
      
    } catch (error) {
      logger.error('Error manually reassigning retailer to line worker', error, { context: 'RetailerService' });
      throw error;
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

  async getPaymentsByRetailerAcrossAllTenants(retailerId: string): Promise<Payment[]> {
    try {
      // Query payments collection directly without tenant filter
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      const q = query(paymentsRef, where('retailerId', '==', retailerId));
      const querySnapshot = await getDocs(q);
      
      const payments: Payment[] = [];
      querySnapshot.forEach((doc) => {
        payments.push({ id: doc.id, ...doc.data() } as Payment);
      });
      
      // Sort in memory by initiatedAt (newest first)
      return payments.sort((a, b) => 
        toMillis(b.timeline.initiatedAt) - toMillis(a.timeline.initiatedAt)
      );
    } catch (error) {
      logger.error('Error getting payments for retailer across all tenants', error, { context: 'PaymentService' });
      throw error;
    }
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
      // Use tenantIds array-contains query for consistency
      const q = query(
        collection(db, this.collectionName),
        where('tenantIds', 'array-contains', tenantId)
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
        where('tenantIds', 'array-contains', tenantId),
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
        tenantIds: [tenantId], // Use tenantIds array
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