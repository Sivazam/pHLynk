import { Timestamp } from 'firebase/firestore';
import { ROLES, PAYMENT_STATES, PAYMENT_METHODS, TENANT_STATUSES } from '@/lib/firebase';

// FCM Device interface for push notifications
export interface FCMDevice {
  token: string;
  deviceId: string;
  userAgent: string;
  lastActive: Timestamp;
  createdAt: Timestamp;
  isActive: boolean;
}

// Base interface with common fields
export interface BaseDocument {
  id: string;
  tenantId?: string; // Optional for backward compatibility
  tenantIds?: string[]; // New array-based approach
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tenant
export interface Tenant extends BaseDocument {
  name: string;
  address?: string;
  status: keyof typeof TENANT_STATUSES;
  subscriptionStatus: string;
  plan: string;
}

// User
export interface User extends BaseDocument {
  email: string;
  phone?: string;
  displayName?: string;
  photoURL?: string;
  roles: (keyof typeof ROLES)[];
  active: boolean;
  assignedAreas?: string[];
  assignedZips?: string[];
  fcmDevices?: FCMDevice[];
}

// Area
export interface Area extends BaseDocument {
  name: string;
  zipcodes: string[];
  active: boolean;
}

// Retailer
export interface Retailer extends BaseDocument {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  active?: boolean; // Added active field
  code?: string; // Wholesaler-assigned alphanumeric code (4-8+ characters)

  // Profile and verification
  profile?: any;
  verification?: any;

  // Legacy fields (kept for backward compatibility)
  areaId?: string;
  zipcodes: string[];

  // Legacy wholesaler assignments (will be migrated to wholesalerData)
  wholesalerAssignments?: {
    [tenantId: string]: {
      areaId?: string;
      zipcodes: string[];
      assignedAt: Timestamp;
    };
  };

  // NEW: Wholesaler-specific isolated data
  wholesalerData?: {
    [tenantId: string]: {
      currentAreaId: string;
      currentZipcodes: string[];
      assignedAt: Timestamp;
      areaAssignmentHistory: Array<{
        areaId: string;
        zipcodes: string[];
        assignedAt: Timestamp;
        isActive: boolean;
      }>;
      notes?: string;
      creditLimit?: number;
      currentBalance?: number;
    };
  };

  // Direct line worker assignment (optional, overrides area-based assignment)
  assignedLineWorkerId?: string | null;

  // Computed fields for performance
  totalPaidAmount?: number;
  totalPaymentsCount?: number;
  lastPaymentDate?: Timestamp;
  recentPayments?: PaymentSummary[];
  computedAt?: Timestamp;

  // Additional fields
  gstNumber?: string;
  paymentTerms?: string;
  fcmDevices?: FCMDevice[];

  // Active OTPs for this retailer
  activeOTPs?: Array<{
    paymentId: string;
    code: string;
    amount: number;
    lineWorkerName: string;
    expiresAt: Timestamp;
    createdAt: Timestamp;
    isUsed?: boolean;
    usedAt?: Timestamp;
  }>;

  // Helper methods for tenant management
  getTenantIds?(): string[];
  hasTenantId?(tenantId: string): boolean;
  addTenantId?(tenantId: string): void;
  removeTenantId?(tenantId: string): void;
}

// Summary interfaces for recent activity
export interface PaymentSummary {
  id: string;
  amount: number;
  method: string;
  date: Timestamp;
  state: string;
}

// Payment OTP Data
export interface PaymentOTP {
  hash: string;
  expiresAt: Timestamp;
  attempts: number;
}

// Standalone OTP Document for Firestore collection
export interface OTP extends BaseDocument {
  paymentId: string;
  retailerId: string;
  code: string;
  amount: number;
  lineWorkerName: string;
  expiresAt: Timestamp;
  isUsed: boolean;
  usedAt?: Timestamp;
  createdAt: Timestamp;
}

// Payment UPI Data
export interface PaymentUPI {
  qrString?: string;
  payerRef?: string;
  txnRef?: string;
}

// Payment Evidence
export interface PaymentEvidence {
  storagePath: string;
  type: 'IMAGE';
  uploadedAt: Timestamp;
}

// Payment Timeline
export interface PaymentTimeline {
  initiatedAt: Timestamp;
  otpSentAt?: Timestamp;
  verifiedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  expiredAt?: Timestamp;
}

// Payment
export interface Payment extends BaseDocument {
  retailerId: string;
  retailerName: string; // Added to preserve historical retailer name
  lineWorkerId: string;
  lineWorkerName?: string; // Optional: may not be available in older records
  totalPaid: number;
  method: keyof typeof PAYMENT_METHODS;
  state: keyof typeof PAYMENT_STATES;
  tenantId: string; // The wholesaler who initiated this payment
  initiatedByTenantName?: string; // Wholesaler name for display in chips
  otp?: PaymentOTP;
  upi?: PaymentUPI;
  evidence: PaymentEvidence[];
  timeline: PaymentTimeline;
  notes?: string;   // Optional notes from line worker
  utr?: string;     // Optional UTR for UPI payments (shorthand)
}

// Payment Event
export interface PaymentEvent extends BaseDocument {
  paymentId: string;
  type: 'STATE_CHANGE' | 'CREATED' | 'CANCELLED' | 'EXPIRED';
  fromState?: keyof typeof PAYMENT_STATES;
  toState?: keyof typeof PAYMENT_STATES;
  actorUserId?: string;
  at: Timestamp;
  meta?: Record<string, any>;
}

// Subscription
export interface Subscription extends BaseDocument {
  tenantId: string;
  plan: string;
  status: string;
  paymentsThisPeriod: number;
  limits: {
    maxPayments: number;
    maxRetailers: number;
    maxLineWorkers: number;
  };
}

// Config
export interface Config extends BaseDocument {
  otpLength: number;
  otpExpirySeconds: number;
  maxOtpAttempts: number;
  smsRateLimitPerHour: number;
}

// UI Related Types
export interface DashboardStats {
  totalRevenue: number;
  todayCollections: number;
  topLineWorkers: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
}

export interface LineWorkerPerformance {
  lineWorkerId: string;
  lineWorkerName: string;
  totalPayments: number;
  totalCollected: number;
  averageCollection: number;
  successRate: number;
  failedAttempts: number;
}

export interface AreaPerformance {
  areaId: string;
  areaName: string;
  collectedThisPeriod: number;
  retailerCount: number;
}

// Form Types
export interface CreateTenantForm {
  name: string;
  plan: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone?: string;
  adminName?: string;
}

export interface CreateAreaForm {
  name: string;
  zipcodes: string[];
}

export interface CreateRetailerForm {
  name: string;
  phone: string;
  address?: string;
  areaId?: string;
  zipcodes: string[];
  code?: string; // Optional alphanumeric retailer code
}

export interface InitiatePaymentForm {
  retailerId: string;
  retailerName: string; // Added to preserve historical retailer name
  totalPaid: number;
  method: keyof typeof PAYMENT_METHODS;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Auth Context Types
export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  tenantId?: string;
  tenantStatus?: string;
  roles: (keyof typeof ROLES)[];
  assignedAreas?: string[];
  assignedZips?: string[];
  // Retailer-specific fields
  isRetailer?: boolean;
  retailerId?: string;
  phone?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loadingProgress?: number;
  loadingStage?: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string, superAdminCode?: string) => Promise<{ user: any; isSuperAdmin: boolean }>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (role: keyof typeof ROLES) => boolean;
  hasAnyRole: (roles: (keyof typeof ROLES)[]) => boolean;
}

// Product Types
export interface ProductData extends BaseDocument {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  active: boolean;
}

// Monthly Targets Types
export interface MonthlyTarget {
  month: string;
  target: number;
  year?: number;
}

export interface MonthlyTargets extends BaseDocument {
  targets: MonthlyTarget[];
  year: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}