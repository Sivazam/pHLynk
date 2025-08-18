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
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@/lib/firebase';
import { toMillis, toDate, compareTimestamps } from '@/lib/timestamp-utils';
import { RetailerAuthService } from './retailer-auth';
import { 
  Tenant, 
  User, 
  Area, 
  Retailer, 
  Invoice, 
  Payment, 
  PaymentEvent, 
  Subscription,
  Config,
  BaseDocument,
  CreateTenantForm,
  CreateAreaForm,
  CreateRetailerForm,
  CreateInvoiceForm,
  InitiatePaymentForm,
  DashboardStats,
  LineWorkerPerformance,
  AreaPerformance
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
      console.error(`Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async getById(id: string, tenantId: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().tenantId === tenantId) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting document ${id} from ${this.collectionName}:`, error);
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
      console.error(`Error getting documents from ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>, tenantId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(`Error updating document ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${id} from ${this.collectionName}:`, error);
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
      console.error(`Error querying ${this.collectionName}:`, error);
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
    return this.create({
      name: data.name,
      status: 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      plan: data.plan
    }, 'system'); // System-level tenant
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
      console.error('Error getting all tenants:', error);
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
      console.error('Error creating user with auth:', error);
      throw error;
    }
  }

  async createUser(tenantId: string, data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): Promise<string> {
    return this.create(data, tenantId);
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
      console.error(`Error creating user document with ID ${userId}:`, error);
      throw error;
    }
  }

  async getUsersByRole(tenantId: string, role: string): Promise<User[]> {
    return this.query(tenantId, [
      where('roles', 'array-contains', role),
      where('active', '==', true)
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
    }, tenantId);
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
      zipcodes: data.zipcodes,
      currentOutstanding: 0
    }, tenantId);

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
        currentOutstanding: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await RetailerAuthService.createRetailerUser(retailerData, tenantId);
      console.log('✅ Retailer user account created for:', data.phone);
    } catch (error) {
      console.error('❌ Error creating retailer user account:', error);
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

  async updateOutstanding(retailerId: string, tenantId: string, amount: number): Promise<void> {
    const retailer = await this.getById(retailerId, tenantId);
    if (retailer) {
      await this.update(retailerId, { 
        currentOutstanding: Math.max(0, retailer.currentOutstanding + amount) 
      }, tenantId);
    }
  }
}

export class InvoiceService extends FirestoreService<Invoice> {
  constructor() {
    super(COLLECTIONS.INVOICES);
  }

  async createInvoice(tenantId: string, data: CreateInvoiceForm): Promise<string> {
    // Calculate totals
    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const gstAmount = data.lineItems.reduce((sum, item) => {
      const gstPercent = item.gstPercent || 0;
      return sum + (item.qty * item.unitPrice * gstPercent / 100);
    }, 0);
    const totalAmount = subtotal + gstAmount;

    // Create the invoice
    const invoiceId = await this.create({
      retailerId: data.retailerId,
      invoiceNumber: this.generateInvoiceNumber(tenantId),
      issueDate: Timestamp.fromDate(data.issueDate),
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
      subtotal,
      gstAmount,
      totalAmount,
      outstandingAmount: totalAmount,
      status: 'OPEN',
      lineItems: data.lineItems,
      version: 1,
      attachments: []
    }, tenantId);

    // Update retailer's outstanding amount
    try {
      const retailerService = new RetailerService();
      await retailerService.updateOutstanding(data.retailerId, tenantId, totalAmount);
    } catch (error) {
      console.error('Error updating retailer outstanding amount:', error);
      // Don't throw here - the invoice was created successfully
    }

    return invoiceId;
  }

  private generateInvoiceNumber(tenantId: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${tenantId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
  }

  async getInvoicesByRetailer(tenantId: string, retailerId: string): Promise<Invoice[]> {
    const invoices = await this.query(tenantId, [
      where('retailerId', '==', retailerId)
    ]);
    // Sort in memory by issueDate (newest first)
    return invoices.sort((a, b) => 
      toMillis(b.issueDate) - toMillis(a.issueDate)
    );
  }

  async getOpenInvoices(tenantId: string, retailerId?: string): Promise<Invoice[]> {
    // Get all invoices first
    let invoices: Invoice[];
    
    if (retailerId) {
      invoices = await this.query(tenantId, [
        where('retailerId', '==', retailerId)
      ]);
    } else {
      invoices = await this.getAll(tenantId);
    }
    
    // Filter in memory for open invoices with outstanding amount
    const openInvoices = invoices.filter(invoice => 
      (invoice.status === 'OPEN' || invoice.status === 'PARTIAL') && 
      invoice.outstandingAmount > 0
    );
    
    // Sort in memory by issueDate (oldest first)
    return openInvoices.sort((a, b) => 
      toMillis(a.issueDate) - toMillis(b.issueDate)
    );
  }

  async updateInvoiceOutstanding(invoiceId: string, tenantId: string, amount: number): Promise<void> {
    const invoice = await this.getById(invoiceId, tenantId);
    if (invoice) {
      const newOutstanding = Math.max(0, invoice.outstandingAmount - amount);
      const newStatus = newOutstanding === 0 ? 'PAID' : 'PARTIAL';
      
      await this.update(invoiceId, {
        outstandingAmount: newOutstanding,
        status: newStatus,
        version: invoice.version + 1
      }, tenantId);
    }
  }
}

export class PaymentService extends FirestoreService<Payment> {
  constructor() {
    super(COLLECTIONS.PAYMENTS);
  }

  async initiatePayment(tenantId: string, data: InitiatePaymentForm & { lineWorkerId: string }): Promise<string> {
    return this.create({
      retailerId: data.retailerId,
      lineWorkerId: data.lineWorkerId,
      invoiceAllocations: data.invoiceAllocations,
      totalPaid: data.totalPaid,
      method: data.method,
      state: 'INITIATED',
      evidence: [],
      timeline: {
        initiatedAt: Timestamp.now()
      }
    }, tenantId);
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

  async updatePaymentState(paymentId: string, tenantId: string, state: string, updates: Partial<Payment> = {}): Promise<void> {
    const payment = await this.getById(paymentId, tenantId);
    if (!payment) return;

    // Merge timeline updates properly
    const updatedTimeline = {
      ...payment.timeline,
      ...updates.timeline
    };

    // If payment is being completed, update outstanding amounts
    if (state === 'COMPLETED' && payment.state !== 'COMPLETED') {
      try {
        const invoiceService = new InvoiceService();
        const retailerService = new RetailerService();

        // Update invoice outstanding amount
        await invoiceService.updateInvoiceOutstanding(paymentId, tenantId, payment.totalPaid);

        // Update retailer outstanding amount (reduce by payment amount)
        await retailerService.updateOutstanding(payment.retailerId, tenantId, -payment.totalPaid);
      } catch (error) {
        console.error('Error updating outstanding amounts:', error);
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
          console.log(`Cleaning up stuck payment ${payment.id} initiated at ${toDate(payment.timeline.initiatedAt)}`);
          await this.updatePaymentState(payment.id, tenantId, 'CANCELLED', {
            timeline: {
              ...payment.timeline,
              cancelledAt: Timestamp.now()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error cleaning up stuck payments:', error);
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
    }, tenantId);
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
      invoicesThisPeriod: 0,
      paymentsThisPeriod: 0,
      limits: {
        maxInvoices: 1000,
        maxPayments: 5000,
        maxRetailers: 100,
        maxLineWorkers: 10
      }
    }, tenantId);
  }

  async incrementUsage(tenantId: string, type: 'invoices' | 'payments'): Promise<void> {
    const subscription = await this.getByTenantId(tenantId);
    if (subscription) {
      const field = type === 'invoices' ? 'invoicesThisPeriod' : 'paymentsThisPeriod';
      await this.update(subscription.id, {
        [field]: subscription[field] + 1
      }, tenantId);
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
      console.error('Error getting subscription by tenant:', error);
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
      console.error('Error uploading evidence:', error);
      throw error;
    }
  }
}

export class DashboardService {
  static async getWholesalerDashboardStats(tenantId: string): Promise<DashboardStats> {
    try {
      // Get all retailers
      const retailers = await new RetailerService().getAll(tenantId);
      const totalOutstanding = retailers.reduce((sum, retailer) => sum + retailer.currentOutstanding, 0);

      // Get today's completed payments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all completed payments and filter in memory
      const allPayments = await new PaymentService().query(tenantId, [
        where('state', '==', 'COMPLETED')
      ]);
      
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
        totalOutstanding,
        todayCollections,
        agingBuckets,
        topLineWorkers
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
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
}

// Export service instances and Firebase utilities
export const tenantService = new TenantService();
export const userService = new UserService();
export const areaService = new AreaService();
export const retailerService = new RetailerService();
export const invoiceService = new InvoiceService();
export const paymentService = new PaymentService();
export const paymentEventService = new PaymentEventService();
export const subscriptionService = new SubscriptionService();
export { Timestamp };