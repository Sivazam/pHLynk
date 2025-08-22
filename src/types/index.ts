import { Timestamp } from 'firebase/firestore';
import { ROLES, PAYMENT_STATES, PAYMENT_METHODS, INVOICE_STATUSES, TENANT_STATUSES } from '@/lib/firebase';

// Base interface with common fields
export interface BaseDocument {
  id: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tenant
export interface Tenant extends BaseDocument {
  name: string;
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
  areaId?: string;
  zipcodes: string[];
  currentOutstanding: number;
  
  // Direct line worker assignment (optional, overrides area-based assignment)
  assignedLineWorkerId?: string;
  
  // Computed fields for performance
  totalInvoiceAmount?: number;
  totalPaidAmount?: number;
  totalInvoicesCount?: number;
  totalPaymentsCount?: number;
  lastInvoiceDate?: Timestamp;
  lastPaymentDate?: Timestamp;
  recentInvoices?: InvoiceSummary[];
  recentPayments?: PaymentSummary[];
  computedAt?: Timestamp;
  
  // Additional fields
  creditLimit?: number;
  gstNumber?: string;
  paymentTerms?: string;
}

// Summary interfaces for recent activity
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  issueDate: Timestamp;
  status: string;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  method: string;
  date: Timestamp;
  state: string;
}

// Invoice Line Item
export interface InvoiceLineItem {
  name: string;
  qty: number;
  unitPrice: number;
  gstPercent?: number;
  batch?: string;
  expiry?: string;
}

// Invoice Attachment
export interface InvoiceAttachment {
  storagePath: string;
  type: string;
  uploadedAt: Timestamp;
}

// Invoice
export interface Invoice extends BaseDocument {
  retailerId: string;
  invoiceNumber: string;
  userInvoiceNumber?: string;
  issueDate: Timestamp;
  dueDate?: Timestamp;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  outstandingAmount: number;
  status: keyof typeof INVOICE_STATUSES;
  lineItems: InvoiceLineItem[];
  version: number;
  attachments: InvoiceAttachment[];
}

// Payment Invoice Allocation
export interface PaymentInvoiceAllocation {
  invoiceId: string;
  amount: number;
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
  lineWorkerId: string;
  invoiceAllocations: PaymentInvoiceAllocation[];
  totalPaid: number;
  method: keyof typeof PAYMENT_METHODS;
  state: keyof typeof PAYMENT_STATES;
  otp?: PaymentOTP;
  upi?: PaymentUPI;
  evidence: PaymentEvidence[];
  timeline: PaymentTimeline;
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
  invoicesThisPeriod: number;
  paymentsThisPeriod: number;
  limits: {
    maxInvoices: number;
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
  totalOutstanding: number;
  todayCollections: number;
  agingBuckets: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
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
  totalOutstanding: number;
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
}

export interface CreateInvoiceForm {
  retailerId: string;
  invoiceNumber?: string;
  userInvoiceNumber?: string;
  issueDate: Date;
  dueDate?: Date;
  lineItems: Omit<InvoiceLineItem, 'id'>[];
}

export interface InitiatePaymentForm {
  retailerId: string;
  totalPaid: number;
  method: keyof typeof PAYMENT_METHODS;
  invoiceAllocations: PaymentInvoiceAllocation[];
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
  roles: (keyof typeof ROLES)[];
  assignedAreas?: string[];
  assignedZips?: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
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