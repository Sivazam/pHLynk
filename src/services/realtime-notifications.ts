import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { formatTimestampWithTime, toDate } from '@/lib/timestamp-utils';
import { NotificationItem } from '@/components/DashboardNavigation';
import { notificationService } from './notification-service';

// Real-time notification service using Firebase onSnapshot
export class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private unsubscribeFunctions: Map<string, () => void> = new Map();
  private notificationCallbacks: Map<string, (notifications: NotificationItem[]) => void> = new Map();
  private userTenantIds: Map<string, string> = new Map(); // Track tenantId for each user
  private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly UPDATE_DELAY = 3000; // 3 second delay between updates (increased from 1 second)

  private constructor() {}

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  // Start listening to notifications for a specific user/role
  startListening(
    userId: string,
    role: string,
    tenantId: string,
    callback: (notifications: NotificationItem[]) => void
  ): void {
    console.log('🔔 Starting notification listener for user:', userId, 'role:', role, 'tenant:', tenantId);
    
    // Stop any existing listeners for this user
    this.stopListening(userId);

    // Store the callback and tenantId
    this.notificationCallbacks.set(userId, callback);
    this.userTenantIds.set(userId, tenantId);

    // Immediately provide current notifications to the callback for this tenant
    const currentNotifications = notificationService.getNotifications(tenantId);
    console.log('🔔 Providing current notifications to callback:', currentNotifications.length, 'notifications for tenant:', tenantId);
    
    // Only call callback if there are notifications to prevent unnecessary initial render
    if (currentNotifications.length > 0) {
      // Ensure callback is called asynchronously to prevent timing issues
      setTimeout(() => {
        try {
          callback(currentNotifications);
        } catch (error) {
          console.error('Error in initial notification callback:', error);
        }
      }, 0);
    } else {
      console.log('🔔 Skipping initial callback - no notifications to show for tenant:', tenantId);
    }

    // Start role-specific listeners
    switch (role) {
      case 'SUPER_ADMIN':
        this.startSuperAdminListeners(userId, tenantId);
        break;
      case 'WHOLESALER_ADMIN':
        this.startWholesalerAdminListeners(userId, tenantId);
        break;
      case 'LINE_WORKER':
        this.startLineWorkerListeners(userId, tenantId);
        break;
      case 'RETAILER':
        this.startRetailerListeners(userId, tenantId);
        break;
    }
  }

  // Stop listening to notifications for a specific user
  stopListening(userId: string): void {
    const unsubscribe = this.unsubscribeFunctions.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribeFunctions.delete(userId);
    }
    
    // Clear any pending update timeouts
    const timeout = this.updateTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.updateTimeouts.delete(userId);
    }
    
    // Remove callback and tenantId mapping
    this.notificationCallbacks.delete(userId);
    this.userTenantIds.delete(userId);
  }

  // Trigger callback with delay to prevent rapid updates
  private triggerCallback(userId: string): void {
    // Clear any existing timeout
    const existingTimeout = this.updateTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      const callback = this.notificationCallbacks.get(userId);
      const tenantId = this.userTenantIds.get(userId);
      
      if (callback && tenantId) {
        try {
          let notifications;
          
          // For Super Admin (tenantId === 'all'), get all notifications across all tenants
          if (tenantId === 'all') {
            notifications = notificationService.getAllNotifications();
            console.log('🔔 Super Admin: Getting all notifications across all tenants:', notifications.length, 'total notifications');
          } else {
            // For regular users, get notifications for their specific tenant
            notifications = notificationService.getNotifications(tenantId);
            console.log('🔔 Getting notifications for tenant:', tenantId, notifications.length, 'notifications');
          }
          
          // Only trigger callback if there are actual notifications to prevent unnecessary re-renders
          if (notifications.length > 0) {
            console.log('🔔 Triggering callback for user', userId, 'with', notifications.length, 'notifications');
            callback(notifications);
          } else {
            console.log('🔔 Skipping callback for user', userId, '- no notifications to show');
          }
        } catch (error) {
          console.error(`Error in notification callback for user ${userId}:`, error);
        }
      } else if (!tenantId) {
        console.warn('🔔 No tenantId found for user:', userId, 'skipping callback');
      }
      this.updateTimeouts.delete(userId);
    }, this.UPDATE_DELAY);

    this.updateTimeouts.set(userId, timeout);
  }

  // Super Admin listeners - gets updates about all activities
  private startSuperAdminListeners(userId: string, tenantId: string): void {
    console.log('🔔 Starting Super Admin notification listeners');

    // For Super Admin, we store a special tenantId 'all' to indicate they should see all notifications
    this.userTenantIds.set(userId, 'all');

    // Listen to all payment activities across all tenants
    const paymentsUnsubscribe = onSnapshot(
      collection(db, COLLECTIONS.PAYMENTS),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const payment = change.doc.data();
            console.log('🔔 Super Admin payment change detected:', payment.id, payment.state);
            this.handleSuperAdminPaymentChange(payment, change.doc.id);
          }
        });
      },
      (error) => {
        console.error('Error listening to payments:', error);
      }
    );

    // Listen to all invoice activities
    const invoicesUnsubscribe = onSnapshot(
      collection(db, COLLECTIONS.INVOICES),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const invoice = change.doc.data();
            console.log('🔔 Super Admin invoice change detected:', invoice.id, invoice.invoiceNumber);
            this.handleSuperAdminInvoiceChange(invoice, change.doc.id);
          }
        });
      },
      (error) => {
        console.error('Error listening to invoices:', error);
      }
    );

    // Listen to user activities (new users, role changes)
    const usersUnsubscribe = onSnapshot(
      collection(db, COLLECTIONS.USERS),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const user = change.doc.data();
            console.log('🔔 Super Admin user change detected:', user.id, user.displayName);
            this.handleSuperAdminUserChange(user, change.doc.id);
          }
        });
      },
      (error) => {
        console.error('Error listening to users:', error);
      }
    );

    // Store unsubscribe function
    this.unsubscribeFunctions.set(userId, () => {
      paymentsUnsubscribe();
      invoicesUnsubscribe();
      usersUnsubscribe();
    });
  }

  // Wholesaler Admin listeners - retailer invoices, lineman activities
  private startWholesalerAdminListeners(userId: string, tenantId: string): void {
    console.log('🔔 Starting Wholesaler Admin notification listeners for tenant:', tenantId);

    // Listen to payments in this tenant
    const paymentsQuery = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('tenantId', '==', tenantId),
      limit(100)
    );

    const paymentsUnsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const payment = change.doc.data();
            this.handleWholesalerPaymentChange(payment, change.doc.id, tenantId);
          }
        });
      },
      (error) => {
        console.error('Error listening to wholesaler payments:', error);
      }
    );

    // Listen to invoices in this tenant
    const invoicesQuery = query(
      collection(db, COLLECTIONS.INVOICES),
      where('tenantId', '==', tenantId),
      limit(50)
    );

    const invoicesUnsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const invoice = change.doc.data();
            this.handleWholesalerInvoiceChange(invoice, change.doc.id, tenantId);
          }
        });
      },
      (error) => {
        console.error('Error listening to wholesaler invoices:', error);
      }
    );

    // Listen to line worker activities in this tenant
    const workersQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('tenantId', '==', tenantId),
      where('roles', 'array-contains', 'LINE_WORKER')
    );

    const workersUnsubscribe = onSnapshot(
      workersQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const worker = change.doc.data();
            this.handleWholesalerWorkerChange(worker, change.doc.id, tenantId);
          }
        });
      },
      (error) => {
        console.error('Error listening to wholesaler workers:', error);
      }
    );

    // Listen to retailers in this tenant for assignment changes
    const retailersQuery = query(
      collection(db, COLLECTIONS.RETAILERS),
      where('tenantId', '==', tenantId),
      limit(100)
    );

    const retailersUnsubscribe = onSnapshot(
      retailersQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const retailer = change.doc.data();
            this.handleWholesalerRetailerChange(retailer, change.doc.id, tenantId);
          }
        });
      },
      (error) => {
        console.error('Error listening to wholesaler retailers:', error);
      }
    );

    // Store unsubscribe function
    this.unsubscribeFunctions.set(userId, () => {
      paymentsUnsubscribe();
      invoicesUnsubscribe();
      workersUnsubscribe();
      retailersUnsubscribe();
    });
  }

  // Line Worker listeners - successful payments, retailer assignments
  private startLineWorkerListeners(userId: string, tenantId: string): void {
    console.log('🔔 Starting Line Worker notification listeners for user:', userId);

    // Listen to payments made by this line worker
    const paymentsQuery = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('tenantId', '==', tenantId),
      where('lineWorkerId', '==', userId),
      limit(50)
    );

    const paymentsUnsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const payment = change.doc.data();
            console.log('🔔 Line Worker payment change detected:', payment.id, payment.state);
            this.handleLineWorkerPaymentChange(payment, change.doc.id, userId);
          }
        });
      },
      (error) => {
        console.error('Error listening to line worker payments:', error);
      }
    );

    // Listen to user document for assignment changes
    const userUnsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USERS, userId),
      (snapshot) => {
        const user = snapshot.data();
        if (user) {
          console.log('🔔 Line Worker assignment change detected:', user.id, user.displayName);
          this.handleLineWorkerAssignmentChange(user, userId);
        }
      },
      (error) => {
        console.error('Error listening to line worker assignments:', error);
      }
    );

    // Listen to retailers assigned to this line worker
    const retailersQuery = query(
      collection(db, COLLECTIONS.RETAILERS),
      where('tenantId', '==', tenantId),
      where('assignedLineWorkerId', '==', userId),
      limit(100)
    );

    const retailersUnsubscribe = onSnapshot(
      retailersQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const retailer = change.doc.data();
            console.log('🔔 Line Worker retailer assigned:', retailer.id, retailer.name);
            this.handleLineWorkerRetailerAssigned(retailer, change.doc.id, userId);
          } else if (change.type === 'removed') {
            const retailer = change.doc.data();
            console.log('🔔 Line Worker retailer unassigned:', retailer.id, retailer.name);
            this.handleLineWorkerRetailerUnassigned(retailer, change.doc.id, userId);
          }
        });
      },
      (error) => {
        console.error('Error listening to line worker retailers:', error);
      }
    );

    // Store unsubscribe function
    this.unsubscribeFunctions.set(userId, () => {
      paymentsUnsubscribe();
      userUnsubscribe();
      retailersUnsubscribe();
    });
  }

  // Retailer listeners - invoices, successful payments, OTP notifications
  private startRetailerListeners(userId: string, tenantId: string): void {
    console.log('🔔 Starting Retailer notification listeners for user:', userId, 'with tenantId:', tenantId);

    // Listen to invoices for this retailer
    const invoicesQuery = query(
      collection(db, COLLECTIONS.INVOICES),
      where('tenantId', '==', tenantId),
      where('retailerId', '==', userId),
      limit(50)
    );

    console.log('🔔 Retailer invoice query created with filters:', {
      collection: COLLECTIONS.INVOICES,
      tenantId: tenantId,
      retailerId: userId
    });

    const invoicesUnsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        console.log('🔔 Retailer invoice snapshot received:', snapshot.size, 'documents');
        snapshot.docChanges().forEach((change) => {
          console.log('🔔 Retailer invoice change detected:', {
            type: change.type,
            docId: change.doc.id,
            data: change.doc.data()
          });
          
          if (change.type === 'added') {
            const invoice = change.doc.data();
            console.log('🔔 Retailer invoice change detected:', invoice.id, invoice.invoiceNumber);
            this.handleRetailerInvoiceChange(invoice, change.doc.id, userId);
          }
        });
      },
      (error) => {
        console.error('Error listening to retailer invoices:', error);
      }
    );

    // Listen to payments for this retailer
    const paymentsQuery = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('tenantId', '==', tenantId),
      where('retailerId', '==', userId),
      limit(50)
    );

    const paymentsUnsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const payment = change.doc.data();
            console.log('🔔 Retailer payment change detected:', payment.id, payment.state);
            this.handleRetailerPaymentChange(payment, change.doc.id, userId);
          }
        });
      },
      (error) => {
        console.error('Error listening to retailer payments:', error);
      }
    );

    // Listen to OTP activities for this retailer
    const otpsQuery = query(
      collection(db, COLLECTIONS.OTPS),
      where('tenantId', '==', tenantId),
      where('retailerId', '==', userId),
      limit(20)
    );

    const otpsUnsubscribe = onSnapshot(
      otpsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const otp = change.doc.data();
            console.log('🔔 Retailer OTP change detected:', otp.id, otp.status);
            this.handleRetailerOtpChange(otp, change.doc.id, userId);
          }
        });
      },
      (error) => {
        console.error('Error listening to retailer OTPs:', error);
      }
    );

    // Store unsubscribe function
    this.unsubscribeFunctions.set(userId, () => {
      invoicesUnsubscribe();
      paymentsUnsubscribe();
      otpsUnsubscribe();
    });
  }

  // Super Admin handlers
  private handleSuperAdminPaymentChange(payment: DocumentData, paymentId: string): void {
    console.log('🔔 Handling Super Admin payment change:', paymentId, payment.state);
    
    if (payment.state === 'COMPLETED') {
      const notification = {
        type: 'success' as const,
        title: 'Payment Completed',
        message: `Payment of ₹${payment.totalPaid?.toLocaleString() || 0} completed by ${payment.lineWorkerName || 'Line Worker'} from ${payment.retailerName || 'Retailer'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        tenantId: payment.tenantId,
        workerName: payment.lineWorkerName,
        retailerName: payment.retailerName
      };
      this.addNotificationToService(notification);
    }
  }

  private handleSuperAdminInvoiceChange(invoice: DocumentData, invoiceId: string): void {
    console.log('🔔 Handling Super Admin invoice change:', invoiceId, invoice.invoiceNumber);
    
    const notification = {
      type: 'info' as const,
      title: 'New Invoice Created',
      message: `Invoice #${invoice.invoiceNumber} for ₹${invoice.totalAmount?.toLocaleString() || 0} created for ${invoice.retailerName || 'Retailer'}`,
      timestamp: toDate(invoice.issueDate),
      read: false,
      amount: invoice.totalAmount,
      tenantId: invoice.tenantId,
      retailerName: invoice.retailerName
    };
    this.addNotificationToService(notification);
  }

  private handleSuperAdminUserChange(user: DocumentData, userId: string): void {
    console.log('🔔 Handling Super Admin user change:', userId, user.displayName);
    
    // Handle user role changes, new user creation, etc.
    if (user.roles && user.roles.includes('LINE_WORKER')) {
      const notification = {
        type: 'info' as const,
        title: 'Line Worker Activity',
        message: `Line Worker ${user.displayName || 'Unknown'} updated in system`,
        timestamp: new Date(),
        read: false,
        tenantId: user.tenantId,
        workerName: user.displayName
      };
      this.addNotificationToService(notification);
    }
  }

  // Wholesaler Admin handlers
  private handleWholesalerPaymentChange(payment: DocumentData, paymentId: string, tenantId: string): void {
    console.log('🔔 Wholesaler payment change detected:', { paymentId, state: payment.state, tenantId });
    
    if (payment.state === 'COMPLETED') {
      const notification = {
        type: 'success' as const,
        title: 'Payment Collected',
        message: `${payment.lineWorkerName || 'Line Worker'} collected ₹${payment.totalPaid?.toLocaleString() || 0} from ${payment.retailerName || 'Retailer'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        workerName: payment.lineWorkerName,
        retailerName: payment.retailerName,
        collectionTime: formatTimestampWithTime(payment.createdAt)
      };
      this.addNotificationToService(notification);
    } else if (payment.state === 'FAILED') {
      const notification = {
        type: 'warning' as const,
        title: 'Payment Failed',
        message: `Payment of ₹${payment.totalPaid?.toLocaleString() || 0} failed for ${payment.lineWorkerName || 'Line Worker'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        workerName: payment.lineWorkerName,
        retailerName: payment.retailerName
      };
      this.addNotificationToService(notification);
    }
  }

  private handleWholesalerInvoiceChange(invoice: DocumentData, invoiceId: string, tenantId: string): void {
    console.log('🔔 Wholesaler invoice change detected:', { invoiceId, invoiceNumber: invoice.invoiceNumber, tenantId });
    
    const notification = {
      type: 'info' as const,
      title: 'New Invoice Created',
      message: `Invoice #${invoice.invoiceNumber} for ₹${invoice.totalAmount?.toLocaleString() || 0} created for ${invoice.retailerName || 'Retailer'}`,
      timestamp: toDate(invoice.issueDate),
      read: false,
      amount: invoice.totalAmount,
      retailerName: invoice.retailerName
    };
    this.addNotificationToService(notification);
  }

  private handleWholesalerWorkerChange(worker: DocumentData, workerId: string, tenantId: string): void {
    console.log('🔔 Wholesaler worker change detected:', { workerId, displayName: worker.displayName, tenantId });
    
    // Handle worker assignment changes, status updates, etc.
    if (worker.assignedAreas && worker.assignedAreas.length > 0) {
      const notification = {
        type: 'info' as const,
        title: 'Line Worker Updated',
        message: `${worker.displayName || 'Line Worker'} assignments updated`,
        timestamp: new Date(),
        read: false,
        workerName: worker.displayName
      };
      this.addNotificationToService(notification);
    }
  }

  private handleWholesalerRetailerChange(retailer: DocumentData, retailerId: string, tenantId: string): void {
    console.log('🔔 Wholesaler retailer change detected:', { retailerId, name: retailer.name, assignedLineWorkerId: retailer.assignedLineWorkerId, tenantId });
    
    // Handle retailer assignment changes
    if (retailer.assignedLineWorkerId !== undefined) {
      const notification = {
        type: 'info' as const,
        title: retailer.assignedLineWorkerId ? 'Retailer Assigned' : 'Retailer Unassigned',
        message: retailer.assignedLineWorkerId 
          ? `${retailer.name || 'Retailer'} has been assigned to a line worker`
          : `${retailer.name || 'Retailer'} has been unassigned from line worker`,
        timestamp: new Date(),
        read: false,
        retailerName: retailer.name
      };
      this.addNotificationToService(notification);
    }
  }

  // Line Worker handlers
  private handleLineWorkerPaymentChange(payment: DocumentData, paymentId: string, lineWorkerId: string): void {
    console.log('🔔 Handling Line Worker payment change:', paymentId, payment.state);
    
    if (payment.state === 'COMPLETED') {
      const notification = {
        type: 'success' as const,
        title: 'Payment Collected Successfully',
        message: `Successfully collected ₹${payment.totalPaid?.toLocaleString() || 0} from ${payment.retailerName || 'Retailer'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        retailerName: payment.retailerName,
        paymentId: paymentId
      };
      this.addNotificationToService(notification);
    } else if (payment.state === 'FAILED') {
      const notification = {
        type: 'warning' as const,
        title: 'Payment Failed',
        message: `Payment of ₹${payment.totalPaid?.toLocaleString() || 0} failed for ${payment.retailerName || 'Retailer'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        retailerName: payment.retailerName,
        paymentId: paymentId
      };
      this.addNotificationToService(notification);
    }
  }

  private handleLineWorkerAssignmentChange(user: DocumentData, userId: string): void {
    console.log('🔔 Handling Line Worker assignment change:', userId, user.displayName);
    
    // Handle new retailer or area assignments
    if (user.assignedAreas && user.assignedAreas.length > 0) {
      const notification = {
        type: 'info' as const,
        title: 'New Assignment',
        message: `You have been assigned to ${user.assignedAreas.length} new area(s)`,
        timestamp: new Date(),
        read: false,
        areaCount: user.assignedAreas.length
      };
      this.addNotificationToService(notification);
    }
  }

  private handleLineWorkerRetailerAssigned(retailer: DocumentData, retailerId: string, lineWorkerId: string): void {
    console.log('🔔 Handling Line Worker retailer assigned:', retailerId, retailer.name);
    
    const notification = {
      type: 'success' as const,
      title: 'New Retailer Assigned',
      message: `${retailer.name || 'Retailer'} has been assigned to you for collection`,
      timestamp: new Date(),
      read: false,
      retailerName: retailer.name,
      amount: retailer.currentOutstanding
    };
    this.addNotificationToService(notification);
  }

  private handleLineWorkerRetailerUnassigned(retailer: DocumentData, retailerId: string, lineWorkerId: string): void {
    console.log('🔔 Handling Line Worker retailer unassigned:', retailerId, retailer.name);
    
    const notification = {
      type: 'info' as const,
      title: 'Retailer Unassigned',
      message: `${retailer.name || 'Retailer'} has been unassigned from you`,
      timestamp: new Date(),
      read: false,
      retailerName: retailer.name
    };
    this.addNotificationToService(notification);
  }

  // Retailer handlers
  private handleRetailerInvoiceChange(invoice: DocumentData, invoiceId: string, retailerId: string): void {
    console.log('🔔 Handling Retailer invoice change:', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      retailerId,
      tenantId: invoice.tenantId,
      invoiceData: invoice
    });
    
    const notification = {
      type: 'info' as const,
      title: 'New Invoice Received',
      message: `New invoice #${invoice.invoiceNumber} for ₹${invoice.totalAmount?.toLocaleString() || 0} has been created`,
      timestamp: toDate(invoice.issueDate),
      read: false,
      amount: invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate ? formatTimestampWithTime(invoice.dueDate) : undefined,
      tenantId: invoice.tenantId // Use the same tenantId as the invoice (wholesaler's tenantId)
    };
    
    console.log('🔔 Creating retailer invoice notification:', notification);
    this.addNotificationToService(notification);
  }

  private handleRetailerPaymentChange(payment: DocumentData, paymentId: string, retailerId: string): void {
    console.log('🔔 Handling Retailer payment change:', paymentId, payment.state);
    
    if (payment.state === 'COMPLETED') {
      const notification = {
        type: 'success' as const,
        title: 'Payment Received',
        message: `Payment of ₹${payment.totalPaid?.toLocaleString() || 0} received from ${payment.lineWorkerName || 'Line Worker'}`,
        timestamp: toDate(payment.createdAt),
        read: false,
        amount: payment.totalPaid,
        workerName: payment.lineWorkerName,
        collectionTime: formatTimestampWithTime(payment.createdAt),
        tenantId: payment.tenantId // Use the same tenantId as the payment (wholesaler's tenantId)
      };
      this.addNotificationToService(notification);
    }
  }

  private handleRetailerOtpChange(otp: DocumentData, otpId: string, retailerId: string): void {
    console.log('🔔 Handling Retailer OTP change:', otpId, otp.status);
    
    if (otp.status === 'SENT') {
      const notification = {
        type: 'info' as const,
        title: 'OTP Sent',
        message: `OTP has been sent for payment verification`,
        timestamp: toDate(otp.createdAt),
        read: false,
        otpId: otpId,
        paymentId: otp.paymentId,
        tenantId: otp.tenantId // Use the same tenantId as the OTP (wholesaler's tenantId)
      };
      this.addNotificationToService(notification);
    } else if (otp.status === 'VERIFIED') {
      const notification = {
        type: 'success' as const,
        title: 'OTP Verified',
        message: `OTP has been successfully verified for payment`,
        timestamp: toDate(otp.createdAt),
        read: false,
        otpId: otpId,
        paymentId: otp.paymentId,
        tenantId: otp.tenantId // Use the same tenantId as the OTP (wholesaler's tenantId)
      };
      this.addNotificationToService(notification);
    }
  }

  // Add notification to the notification service and trigger callbacks
  private addNotificationToService(notification: any): void {
    try {
      console.log('🔔 Adding notification to service:', notification);
      
      // Add a unique identifier to prevent duplicates
      // Use a more deterministic ID based on content to prevent duplicates
      const contentHash = `${notification.title}_${notification.message}_${notification.type}_${notification.amount || 0}_${notification.retailerName || ''}_${notification.workerName || ''}`;
      const uniqueId = this.generateHash(contentHash);
      
      const uniqueNotification = {
        ...notification,
        _timestamp: Date.now(), // Add unique timestamp
        _id: uniqueId // Add deterministic ID based on content
      };
      
      // Extract tenantId from notification, default to 'system' for super admin
      const tenantId = notification.tenantId || 'system';
      
      console.log('🔔 Extracted tenantId for notification:', tenantId);
      
      const notificationId = notificationService.addNotification(uniqueNotification, tenantId);
      console.log('🔔 Notification added with ID:', notificationId, 'for tenant:', tenantId);
      
      // Only trigger callbacks if a notification was actually added (not a duplicate)
      if (notificationId && notificationId !== '') {
        console.log('🔔 Notification was successfully added, triggering callbacks');
        // Trigger all callbacks with delay to prevent rapid re-renders
        this.notificationCallbacks.forEach((callback, userId) => {
          console.log('🔔 Triggering callback for user:', userId);
          this.triggerCallback(userId);
        });
      } else {
        console.log('🔔 Notification was a duplicate, skipping callbacks');
      }
      
    } catch (error) {
      console.error('Error adding notification to service:', error);
    }
  }

  // Simple hash function for generating consistent IDs from content
  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Clean up all listeners
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe, userId) => {
      unsubscribe();
    });
    this.unsubscribeFunctions.clear();
    
    // Clear all update timeouts
    this.updateTimeouts.forEach((timeout, userId) => {
      clearTimeout(timeout);
    });
    this.updateTimeouts.clear();
    
    this.notificationCallbacks.clear();
  }
}

// Export singleton instance
export const realtimeNotificationService = RealTimeNotificationService.getInstance();
