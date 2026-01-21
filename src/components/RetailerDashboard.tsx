'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedReceipt } from '@/components/ui/EnhancedReceipt';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardNavigation, NavItem } from '@/components/DashboardNavigation';
import { PWANotificationManager } from '@/components/PWANotificationManager';
import { NotificationDeduplicatorDebug } from '@/components/NotificationDeduplicatorDebug';
import { useAuth } from '@/contexts/AuthContext';
import { retailerService, paymentService, otpService } from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { enhancedNotificationService } from '@/services/enhanced-notification-service';
import { RetailerAuthService } from '@/services/retailer-auth';
import { Retailer, Payment } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { getActiveOTPsForRetailer, getCompletedPaymentsForRetailer, removeCompletedPayment, addActiveOTP, removeActiveOTP } from '@/lib/otp-store';
import { secureOTPStorage } from '@/lib/secure-otp-storage';
import { otpBridge } from '@/lib/otp-bridge';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, onSnapshot, collection, query, where } from 'firebase/firestore';
import { logger } from '@/lib/logger';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLoadingState } from '@/hooks/useLoadingState';
import {
  Store,
  DollarSign,
  Phone,
  MapPin,
  LogOut,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  Bell,
  Eye,
  Volume2,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Download,
  Share,
  Heart,
  Settings,
  User,
  FileText
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';
import { Confetti } from './ui/Confetti';
import { WholesalerSlider } from './ui/wholesaler-slider';
import ReportDialog from './ui/ReportDialog';
import { RetailerProfileEdit } from './RetailerProfileEdit';
import { RetailerProfileService } from '@/services/retailer-profile-service';
import { LogoutConfirmation } from '@/components/LogoutConfirmation';

export function RetailerDashboard() {
  const { user, logout } = useAuth();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [retailerUser, setRetailerUser] = useState<any>(null);
  const [retailerProfile, setRetailerProfile] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>('all'); // Default to 'all' for consolidated view
  const [availableTenants, setAvailableTenants] = useState<string[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeOTPs, setActiveOTPs] = useState<Array<{
    code: string;
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    expiresAt: Date;
    createdAt: Date;
  }>>([]);
  const [completedPayments, setCompletedPayments] = useState<Array<{
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    completedAt: Date;
  }>>([]);
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [otpCountdowns, setOtpCountdowns] = useState<Map<string, number>>(new Map());
  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [newPayment, setNewPayment] = useState<Payment | null>(null);
  const [newCompletedPayment, setNewCompletedPayment] = useState<{
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    completedAt: Date;
  } | null>(null);
  const [shownOTPpopups, setShownOTPpopups] = useState<Set<string>>(() => {
    // Load from localStorage on component mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shownOTPpopups');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  const [shownCompletedPaymentPopups, setShownCompletedPaymentPopups] = useState<Set<string>>(() => {
    // Load from localStorage on component mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shownCompletedPaymentPopups');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [paymentTab, setPaymentTab] = useState('completed');
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState('today');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { startDate: startOfDay, endDate: endOfDay };
  });
  const [notificationTenantId, setNotificationTenantId] = useState<string | null>(null);
  const [otpUnsubscribe, setOtpUnsubscribe] = useState<(() => void) | null>(null);

  // Success celebration state
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [confettiTimeout, setConfettiTimeout] = useState<NodeJS.Timeout | null>(null);

  // Logout confirmation state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  // Helper function to trigger confetti with proper cleanup
  const triggerConfettiWithCleanup = () => {
    // Clear any existing timeout
    if (confettiTimeout) {
      clearTimeout(confettiTimeout);
      setConfettiTimeout(null);
    }

    // Trigger confetti
    setTriggerConfetti(true);

    // Set timeout to hide confetti after 5 seconds
    const timeout = setTimeout(() => {
      setTriggerConfetti(false);
      setConfettiTimeout(null);
    }, 5000);

    setConfettiTimeout(timeout);
  };

  // Helper functions to manage shown popups with localStorage persistence
  const addToShownOTPpopups = (paymentId: string) => {
    setShownOTPpopups(prev => {
      const newSet = new Set(prev).add(paymentId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('shownOTPpopups', JSON.stringify(Array.from(newSet)));
      }
      return newSet;
    });
  };

  const addToShownCompletedPaymentPopups = (paymentId: string) => {
    setShownCompletedPaymentPopups(prev => {
      const newSet = new Set(prev).add(paymentId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('shownCompletedPaymentPopups', JSON.stringify(Array.from(newSet)));
      }
      return newSet;
    });
  };

  // Clean up old shown popups periodically (keep only last 24 hours)
  const cleanupOldPopups = () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // For OTP popups, we can clean them up since they expire quickly anyway
    setShownOTPpopups(prev => {
      if (prev.size > 100) { // Keep only last 100 to prevent memory issues
        const newArray = Array.from(prev).slice(-100);
        const newSet = new Set(newArray);
        if (typeof window !== 'undefined') {
          localStorage.setItem('shownOTPpopups', JSON.stringify(Array.from(newSet)));
        }
        return newSet;
      }
      return prev;
    });

    // For completed payment popups, clean up old ones
    setShownCompletedPaymentPopups(prev => {
      if (prev.size > 100) { // Keep only last 100 to prevent memory issues
        const newArray = Array.from(prev).slice(-100);
        const newSet = new Set(newArray);
        if (typeof window !== 'undefined') {
          localStorage.setItem('shownCompletedPaymentPopups', JSON.stringify(Array.from(newSet)));
        }
        return newSet;
      }
      return prev;
    });
  };

  // Fetch OTPs from secure storage
  const fetchOTPsFromSecureStorage = async (retailerId: string) => {
    try {
      console.log('🔐 Fetching OTPs from secure storage for retailer:', retailerId);
      const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);

      // Transform secure OTPs to match the expected format
      const transformedOTPs = secureOTPs.map(otp => ({
        code: otp.code,
        retailerId: retailerId,
        amount: otp.amount,
        expiresAt: otp.expiresAt,
        paymentId: otp.paymentId,
        lineWorkerName: otp.lineWorkerName,
        createdAt: otp.createdAt,
        isExpired: otp.isExpired
      }));

      console.log('🔐 Retrieved OTPs from secure storage:', {
        count: transformedOTPs.length,
        paymentIds: transformedOTPs.map(otp => otp.paymentId)
      });

      return transformedOTPs;
    } catch (error) {
      console.error('❌ Error fetching OTPs from secure storage:', error);
      return [];
    }
  };

  // Manual refresh function for OTP data
  const refreshOTPData = async () => {
    if (!retailer || !tenantId) return;

    try {
      console.log('🔄 Manual OTP refresh triggered', {
        retailerId: retailer.id,
        timestamp: new Date().toISOString()
      });

      // Get OTPs from secure storage instead of retailer document
      const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailer.id);

      console.log('🔄 OTP refresh data from secure storage:', {
        activeOTPsFromSecureStorageCount: secureOTPs.length
      });

      // Filter valid OTPs (not expired)
      const validOTPsFromSecureStorage = secureOTPs.filter(otp => !otp.isExpired);

      // Get current active OTPs to compare
      const currentActiveOTPs = getActiveOTPsForRetailer(retailer.id);
      const currentPaymentIds = new Set(currentActiveOTPs.map(otp => otp.paymentId));

      // Only add OTPs that we don't already have
      const newOTPs = validOTPsFromSecureStorage.filter(otp =>
        !currentPaymentIds.has(otp.paymentId)
      );

      if (newOTPs.length > 0) {
        console.log('🆕 Adding new OTPs from manual refresh:', newOTPs.length);

        // Add new OTPs to our in-memory store for display
        newOTPs.forEach((otp) => {
          addActiveOTP({
            code: otp.code,
            retailerId: retailer.id,
            amount: otp.amount,
            paymentId: otp.paymentId,
            lineWorkerName: otp.lineWorkerName,
            expiresAt: otp.expiresAt,
            createdAt: otp.createdAt
          });
        });

        // Refresh the active OTPs state
        const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
        setActiveOTPs(updatedActiveOTPs);

        // Show popup for the latest OTP if not already shown
        const latestOTP = newOTPs[newOTPs.length - 1];
        if (!shownOTPpopups.has(latestOTP.paymentId)) {
          console.log('🆕 Showing popup for new OTP from manual refresh:', latestOTP.paymentId);
          setNewPayment({
            ...latestOTP,
            id: latestOTP.paymentId,
            retailerId: retailer.id,
            retailerName: retailer.name || retailerUser?.name,
            lineWorkerId: '',
            totalPaid: latestOTP.amount,
            method: 'CASH' as any,
            state: 'OTP_SENT' as any,
            evidence: [],
            tenantId: tenantId,
            timeline: {
              initiatedAt: { toDate: () => latestOTP.createdAt } as any,
              otpSentAt: { toDate: () => latestOTP.createdAt } as any,
            },
            createdAt: { toDate: () => latestOTP.createdAt } as any,
            updatedAt: { toDate: () => latestOTP.createdAt } as any,
          });
          setShowOTPPopup(true);

          // Add to shown popups
          addToShownOTPpopups(latestOTP.paymentId);
        }
      } else {
        console.log('📝 No new OTPs found during manual refresh');
      }
    } catch (error) {
      console.error('❌ Error during manual OTP refresh:', error);
    }
  };

  // Standardized loading state management
  const mainLoadingState = useLoadingState();
  const [dataFetchProgress, setDataFetchProgress] = useState(0);

  // Helper functions to filter data by date range
  const filterPaymentsByDateRange = (paymentsData: Payment[]) => {
    return paymentsData.filter(payment => {
      const paymentDate = payment.createdAt.toDate();
      return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    });
  };

  const handleDateRangeChange = (value: string, newDateRange: { startDate: Date; endDate: Date }) => {
    setSelectedDateRangeOption(value);
    setDateRange(newDateRange);
  };

  // Handle profile updates
  const handleProfileUpdate = async (updatedProfile: any) => {
    console.log('📝 Profile updated:', updatedProfile);

    // Update local state
    setRetailerProfile(prev => prev ? { ...prev, profile: updatedProfile } : null);

    // Update retailer name if it changed
    if (updatedProfile.realName && retailer) {
      setRetailer(prev => prev ? { ...prev, name: updatedProfile.realName } : null);
    }

    // Show success message
    setError(null);
    // You could add a success toast here if you have one
  };
  const handleTenantSwitch = async (newTenantId: string) => {
    if (!retailer || newTenantId === tenantId) return;

    try {
      console.log('🔄 Switching tenant from', tenantId, 'to', newTenantId);

      let paymentsData: Payment[] = [];

      if (newTenantId === 'all') {
        // Fetch consolidated payments from all tenants
        paymentsData = await paymentService.getPaymentsByRetailerAcrossAllTenants(retailer.id);
        setTenantId('all');
      } else {
        // Fetch payments for the specific tenant
        paymentsData = await paymentService.getPaymentsByRetailer(newTenantId, retailer.id);
        setTenantId(newTenantId);

        // Fetch wholesaler name for the new tenant
        await getWholesalerName(newTenantId);
      }

      setPayments(paymentsData);

      console.log('✅ Tenant switched successfully', {
        newTenantId,
        isAll: newTenantId === 'all',
        paymentsCount: paymentsData.length
      });
    } catch (error) {
      console.error('❌ Error switching tenant:', error);
      setError('Failed to switch wholesaler. Please try again.');
    }
  };

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  // Enhanced notification callback with proper count updates
  const handleNotificationUpdate = useCallback((newNotifications: any[]) => {
    console.log('🔔 Retailer: Updating notifications', {
      total: newNotifications.length,
      unread: newNotifications.filter(n => !n.read).length
    });

    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    enhancedNotificationService.markAsRead(notificationId);
    // Update local state to reflect the change immediately
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setNotificationCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    enhancedNotificationService.markAllAsRead();
    // Update local state immediately
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotificationCount(0);
  }, []);

  // Test notification function for debugging
  const testOTPNotification = async () => {
    console.log('🧪 Testing enhanced OTP notification manually...');

    try {
      const result = await enhancedNotificationService.sendOTPNotification(
        retailer?.id || 'test-retailer-id',
        '123456',
        1000,
        'Test Line Worker'
      );

      console.log('🧪 Test OTP notification result:', result);

      if (result) {
        alert('✅ Test OTP notification sent successfully! Check your notification panel and console.');
      } else {
        alert('❌ Test OTP notification failed. Check console for details.');
      }
    } catch (error) {
      console.error('🧪 Test OTP notification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('❌ Test OTP notification error: ' + errorMessage);
    }
  };
  const [wholesalerNames, setWholesalerNames] = useState<Record<string, string>>({});
  const [lineWorkerNames, setLineWorkerNames] = useState<Record<string, string>>({});

  // Direct wholesaler name fetch component for inline use
  const WholesalerNameCell: React.FC<{ tenantId: string }> = ({ tenantId }) => {
    const [wholesalerName, setWholesalerName] = useState<string>('Loading...');

    useEffect(() => {
      const fetchWholesalerName = async () => {
        if (!tenantId || tenantId === 'all') {
          setWholesalerName('All Wholesalers');
          return;
        }

        // Check cache first
        if (wholesalerNames[tenantId]) {
          setWholesalerName(wholesalerNames[tenantId]);
          return;
        }

        try {
          const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
          if (tenantDoc.exists()) {
            const tenantData = tenantDoc.data();
            const name = tenantData.name || 'Unknown Wholesaler';
            setWholesalerNames(prev => ({ ...prev, [tenantId]: name }));
            setWholesalerName(name);
          } else {
            setWholesalerName('Unknown Wholesaler');
          }
        } catch (error) {
          console.error('Error fetching wholesaler name:', error);
          setWholesalerName('Unknown Wholesaler');
        }
      };

      fetchWholesalerName();
    }, [tenantId]); // Remove wholesalerNames from dependency array to prevent infinite loop

    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
        {wholesalerName}
      </Badge>
    );
  };

  // Status display component for retailer perspective
  const PaymentStatusCell: React.FC<{ state: string }> = ({ state }) => {
    const getDisplayStatus = (originalState: string) => {
      switch (originalState) {
        case 'OTP_SENT':
          return 'OTP_Received';
        case 'COMPLETED':
          return 'Completed';
        case 'CANCELLED':
          return 'Cancelled';
        case 'INITIATED':
          return 'Initiated';
        case 'OTP_VERIFIED':
          return 'OTP_Verified';
        default:
          return originalState;
      }
    };

    const getStatusColor = (originalState: string) => {
      switch (originalState) {
        case 'COMPLETED':
          return 'bg-green-100 text-green-800';
        case 'OTP_SENT':
          return 'bg-blue-100 text-blue-800';
        case 'CANCELLED':
          return 'bg-red-100 text-red-800';
        case 'INITIATED':
          return 'bg-yellow-100 text-yellow-800';
        case 'OTP_VERIFIED':
          return 'bg-purple-100 text-purple-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const displayStatus = getDisplayStatus(state);

    return (
      <Badge className={getStatusColor(state)}>
        {displayStatus}
      </Badge>
    );
  };

  // Get wholesaler/tenant name by tenantId - direct fetch like EnhancedReceipt
  const getWholesalerName = async (tenantId: string): Promise<string> => {
    if (tenantId === 'all') {
      return 'All Wholesalers';
    }

    if (wholesalerNames[tenantId]) {
      return wholesalerNames[tenantId];
    }

    try {
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (tenantDoc.exists()) {
        const tenantData = tenantDoc.data();
        const name = tenantData.name || 'Unknown Wholesaler';
        setWholesalerNames(prev => ({ ...prev, [tenantId]: name }));
        return name;
      }
    } catch (error) {
      logger.error('Error fetching wholesaler name', error, { context: 'RetailerDashboard' });
    }

    return 'Unknown Wholesaler';
  };
  const getLineWorkerName = async (lineWorkerId: string): Promise<string> => {
    if (lineWorkerNames[lineWorkerId]) {
      return lineWorkerNames[lineWorkerId];
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', lineWorkerId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const name = userData.displayName || userData.email || 'Unknown Line Worker';
        setLineWorkerNames(prev => ({ ...prev, [lineWorkerId]: name }));
        return name;
      }
    } catch (error) {
      logger.error('Error fetching line worker name', error, { context: 'RetailerDashboard' });
    }

    return 'Unknown Line Worker';
  };

  // Load all necessary data (line workers and available wholesalers)
  const loadAdditionalData = async () => {
    if (!payments.length) return;

    // Get unique lineWorkerIds from payments
    const uniqueLineWorkerIds = new Set<string>();

    // Extract lineWorkerIds from payments
    payments.forEach(payment => {
      if (payment.lineWorkerId) {
        uniqueLineWorkerIds.add(payment.lineWorkerId);
      }
    });

    // Always fetch names for all available tenants (for dropdown and slider)
    if (availableTenants.length > 0) {
      for (const tenantId of availableTenants) {
        await getWholesalerName(tenantId);
      }
    }

    // Fetch line worker names
    for (const lineWorkerId of uniqueLineWorkerIds) {
      await getLineWorkerName(lineWorkerId);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Get retailerId from AuthContext user or fallback to localStorage for backward compatibility
    let retailerId: string | undefined = user?.retailerId;
    if (!retailerId) {
      const storedRetailerId = localStorage.getItem('retailerId');
      console.log('📝 Using stored retailerId from localStorage:', storedRetailerId);
      if (storedRetailerId) {
        retailerId = storedRetailerId;
      }
    }

    console.log('🔍 Final retailerId for data fetch:', retailerId);

    if (retailerId) {
      // Reset loading state and start fetching data
      mainLoadingState.setLoading(true);
      setDataFetchProgress(0);

      // Initialize enhanced notification service for retailer
      enhancedNotificationService.initialize('RETAILER', tenantId || 'system');

      // Start enhanced real-time notifications
      enhancedNotificationService.startRealtimeListening(
        retailerId,
        handleNotificationUpdate
      );

      fetchRetailerData(retailerId);
    } else {
      console.log('⚠️ No retailerId found, skipping data fetch');
      mainLoadingState.setLoading(false);
    }

    // Cleanup on unmount
    return () => {
      let retailerId: string | undefined = user?.retailerId;
      if (!retailerId) {
        const storedRetailerId = localStorage.getItem('retailerId');
        if (storedRetailerId) {
          retailerId = storedRetailerId;
        }
      }

      if (retailerId) {
        enhancedNotificationService.stopRealtimeListening(retailerId);
      }

      // Clean up OTP listener
      if (otpUnsubscribe) {
        otpUnsubscribe();
        setOtpUnsubscribe(null);
      }

      // Clean up confetti timeout
      if (confettiTimeout) {
        clearTimeout(confettiTimeout);
        setConfettiTimeout(null);
      }
    };
  }, [user, handleNotificationUpdate]);

  // Backup initialization for manual browser refresh - runs once on component mount
  useEffect(() => {
    console.log('🔄 RetailerDashboard mount useEffect triggered (backup initialization)', {
      timestamp: new Date().toISOString()
    });

    // Wait a bit for localStorage states to be properly initialized before doing anything
    const initTimeout = setTimeout(() => {
      // Check if we already have a retailerId from the main useEffect
      let retailerId: string | undefined = user?.retailerId;
      if (!retailerId) {
        const storedRetailerId = localStorage.getItem('retailerId');
        console.log('📝 Backup init: Using stored retailerId from localStorage:', storedRetailerId);
        if (storedRetailerId) {
          retailerId = storedRetailerId;
        }
      }

      // If we have a retailerId but no data is loaded yet, trigger data fetch
      if (retailerId && !retailer && !mainLoadingState.loadingState.isLoading) {
        console.log('🔄 Backup init: Triggering data fetch for retailerId:', retailerId);
        mainLoadingState.setLoading(true);
        setDataFetchProgress(0);
        fetchRetailerData(retailerId);
      }

      // Clean up expired OTPs on mount to prevent them from showing
      if (retailerId) {
        const currentActiveOTPs = getActiveOTPsForRetailer(retailerId);
        const validOTPs = currentActiveOTPs.filter(otp => {
          const now = new Date();
          const isExpired = otp.expiresAt <= now;
          return !isExpired;
        });

        if (validOTPs.length < currentActiveOTPs.length) {
          console.log('🧹 Cleaning up expired OTPs on mount:', {
            total: currentActiveOTPs.length,
            valid: validOTPs.length,
            expired: currentActiveOTPs.length - validOTPs.length
          });

          // Remove expired OTPs from the store
          currentActiveOTPs.forEach(otp => {
            const now = new Date();
            const isExpired = otp.expiresAt <= now;
            if (isExpired) {
              removeActiveOTP(otp.paymentId);
            }
          });

          // Update state with only valid OTPs
          setActiveOTPs(validOTPs);
        }
      }

      // Clean up old popup history on mount
      cleanupOldPopups();
    }, 500); // Wait 500ms for localStorage states to initialize

    return () => clearTimeout(initTimeout);
  }, []); // Empty dependency array - runs only once on mount

  // Periodic refresh for OTP data - ensures we don't miss any real-time updates
  useEffect(() => {
    if (retailer && tenantId) {
      const refreshInterval = setInterval(() => {
        // Only refresh if we're not already loading and we have a valid retailer
        if (!mainLoadingState.loadingState.isLoading && retailer.id) {
          console.log('⏰ Periodic OTP refresh check');
          refreshOTPData();

          // Also check for completed payments that should close OTP popup
          checkCompletedPayments();

          // Sync OTPs with Firestore to ensure consistency
          syncOTPsFromFirestore();

          // Clean up expired OTPs periodically
          const currentActiveOTPs = getActiveOTPsForRetailer(retailer.id);
          const validOTPs = currentActiveOTPs.filter(otp => {
            const now = new Date();
            const isExpired = otp.expiresAt <= now;
            return !isExpired;
          });

          if (validOTPs.length < currentActiveOTPs.length) {
            console.log('🧹 Periodic cleanup of expired OTPs:', {
              total: currentActiveOTPs.length,
              valid: validOTPs.length,
              expired: currentActiveOTPs.length - validOTPs.length
            });

            // Remove expired OTPs from the store
            currentActiveOTPs.forEach(otp => {
              const now = new Date();
              const isExpired = otp.expiresAt <= now;
              if (isExpired) {
                removeActiveOTP(otp.paymentId);
              }
            });

            // Update state with only valid OTPs
            setActiveOTPs(validOTPs);
          }

          // Cleanup old shown popups to prevent memory leaks
          cleanupOldPopups();
        }
      }, 5000); // Check every 5 seconds as a fallback

      return () => clearInterval(refreshInterval);
    }
  }, [retailer, tenantId, mainLoadingState.loadingState.isLoading]);

  // In-app notification listener for fallback notifications
  useEffect(() => {
    const handleInAppNotification = (event: CustomEvent) => {
      console.log('📱 Received in-app notification:', event.detail);

      const { payload, notificationData } = event.detail;

      // Check if this is an OTP notification
      if (notificationData.type === 'otp') {
        const otpData = notificationData.data;

        // Check if we've already shown this OTP
        if (!shownOTPpopups.has(otpData.paymentId)) {
          console.log('🆕 Showing OTP from in-app notification:', otpData.paymentId);

          setNewPayment({
            ...otpData,
            id: otpData.paymentId,
            retailerId: retailer?.id || '',
            retailerName: retailer?.name || '',
            lineWorkerId: '',
            totalPaid: otpData.amount,
            method: 'CASH' as any,
            state: 'OTP_SENT' as any,
            evidence: [],
            tenantId: tenantId || '',
            timeline: {
              initiatedAt: { toDate: () => otpData.createdAt || new Date() } as any,
              otpSentAt: { toDate: () => otpData.createdAt || new Date() } as any,
            },
            createdAt: { toDate: () => otpData.createdAt || new Date() } as any,
            updatedAt: { toDate: () => otpData.createdAt || new Date() } as any,
          });
          setShowOTPPopup(true);

          // Add to shown popups
          addToShownOTPpopups(otpData.paymentId);
        }
      }

      // Check if this is a payment completed notification
      if (notificationData.type === 'payment_completed') {
        const paymentData = notificationData.data;

        // Check if we've already shown this payment
        if (!shownCompletedPaymentPopups.has(paymentData.paymentId)) {
          console.log('🆕 Showing payment completion from in-app notification:', paymentData.paymentId);

          setNewCompletedPayment({
            paymentId: paymentData.paymentId,
            amount: paymentData.amount,
            lineWorkerName: paymentData.lineWorkerName,
            completedAt: paymentData.completedAt
          });
          setShowSettlementPopup(true);
          triggerConfettiWithCleanup();

          // Add to shown popups
          addToShownCompletedPaymentPopups(paymentData.paymentId);
        }
      }
    };

    // Add event listener
    window.addEventListener('inAppNotification', handleInAppNotification as EventListener);

    // Check for missed notifications on mount
    if (typeof window !== 'undefined') {
      import('@/services/role-based-notification-service').then(({ roleBasedNotificationService }) => {
        if (roleBasedNotificationService) {
          roleBasedNotificationService.checkMissedNotifications();
        }
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('inAppNotification', handleInAppNotification as EventListener);
    };
  }, [retailer, tenantId, shownOTPpopups, shownCompletedPaymentPopups]);

  // Sync OTPs from secure storage to ensure consistency
  const syncOTPsFromFirestore = async () => {
    if (!retailer || !tenantId) return;

    try {
      console.log('🔄 Syncing OTPs from secure storage for retailer:', retailer.id);
      console.log('🔍 Retailer details:', {
        id: retailer.id,
        name: retailer.name,
        tenantId: tenantId
      });

      // Get OTPs from secure storage instead of retailer document array
      const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailer.id);

      console.log('🔍 Secure storage raw OTPs:', {
        count: secureOTPs.length,
        otps: secureOTPs.map(otp => ({
          paymentId: otp.paymentId,
          code: otp.code,
          amount: otp.amount,
          expiresAt: otp.expiresAt,
          isExpired: otp.isExpired
        }))
      });

      // Get valid OTPs (not expired) from secure storage
      const validOTPsFromSecureStorage = secureOTPs.filter(otp => !otp.isExpired);

      console.log('🔄 Sync: Found', validOTPsFromSecureStorage.length, 'valid OTPs from secure storage');

      // Get current active OTPs from local store
      const currentActiveOTPs = getActiveOTPsForRetailer(retailer.id);
      const secureStoragePaymentIds = new Set(validOTPsFromSecureStorage.map(otp => otp.paymentId));

      // Remove OTPs that are no longer valid in secure storage
      const otpsToRemove = currentActiveOTPs.filter(otp => !secureStoragePaymentIds.has(otp.paymentId));

      if (otpsToRemove.length > 0) {
        console.log('🔄 Sync: Removing invalid OTPs:', otpsToRemove.length);
        otpsToRemove.forEach(otp => {
          removeActiveOTP(otp.paymentId);
          otpBridge.removeOTP(otp.paymentId);
        });

        // Update the state
        const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
        setActiveOTPs(updatedActiveOTPs);
      }

      // Add any new OTPs from secure storage that aren't in local store
      const currentPaymentIds = new Set(currentActiveOTPs.map(otp => otp.paymentId));
      const newOTPs = validOTPsFromSecureStorage.filter(otp => !currentPaymentIds.has(otp.paymentId));

      if (newOTPs.length > 0) {
        console.log('🔄 Sync: Adding new OTPs:', newOTPs.length);
        newOTPs.forEach(otp => {
          addActiveOTP({
            code: otp.code,
            retailerId: retailer.id,
            amount: otp.amount,
            paymentId: otp.paymentId,
            lineWorkerName: otp.lineWorkerName,
            expiresAt: otp.expiresAt,
            createdAt: otp.createdAt
          });
        });

        // Update the state
        const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
        setActiveOTPs(updatedActiveOTPs);
      }

    } catch (error) {
      console.error('❌ Error syncing OTPs from secure storage:', error);
    }
  };

  // Check for completed payments and close OTP popup if needed
  const checkCompletedPayments = async () => {
    if (!retailer || !tenantId) return;

    try {
      // Check for recently completed payments
      const paymentsRef = collection(db, 'payments');
      const paymentQuery = query(paymentsRef, where('retailerId', '==', retailer.id), where('state', '==', 'COMPLETED'));
      const paymentSnapshot = await getDocs(paymentQuery);

      const recentCompletedPayments = paymentSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          completedAt: data.timeline?.completedAt?.toDate()
        } as Payment & { completedAt: Date };
      }).filter(payment => {
        if (!payment.completedAt) return false;
        const now = new Date();
        const timeSinceCompletion = now.getTime() - payment.completedAt.getTime();
        return timeSinceCompletion < 5 * 60 * 1000; // Within last 5 minutes
      });

      if (recentCompletedPayments.length > 0) {
        console.log('🔍 Found recent completed payments:', recentCompletedPayments.length);

        // Close OTP popup immediately
        setShowOTPPopup(false);

        // Clear any new payment data to prevent OTP popup from reappearing
        setNewPayment(null);

        // Remove OTPs from active display for completed payments
        recentCompletedPayments.forEach(payment => {
          removeActiveOTP(payment.id);
          otpBridge.removeOTP(payment.id);
        });

        const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
        setActiveOTPs(updatedActiveOTPs);

        // Show success popup for the most recent completion ONLY if not already shown
        const latestPayment = recentCompletedPayments[recentCompletedPayments.length - 1];
        if (!shownCompletedPaymentPopups.has(latestPayment.id)) {
          setNewCompletedPayment({
            amount: latestPayment.totalPaid || 0,
            paymentId: latestPayment.id,
            lineWorkerName: latestPayment.lineWorkerName || 'Line Worker',
            completedAt: latestPayment.completedAt
          });
          setShowSettlementPopup(true);
          triggerConfettiWithCleanup();

          // Add to shown completed payment popups FIRST to prevent re-showing
          addToShownCompletedPaymentPopups(latestPayment.id);

          // Refresh dashboard data to show updated stats
          setTimeout(() => {
            console.log('🔄 Refreshing dashboard data after payment completion');
            fetchRetailerData(retailer.id);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error checking completed payments:', error);
    }
  };

  // Load additional data when payments change
  useEffect(() => {
    if (payments.length > 0) {
      loadAdditionalData();
    }
  }, [payments]);

  // Load wholesaler names when availableTenants change
  useEffect(() => {
    if (availableTenants.length > 0) {
      const loadWholesalerNames = async () => {
        for (const tenantId of availableTenants) {
          await getWholesalerName(tenantId);
        }
      };
      loadWholesalerNames();
    }
  }, [availableTenants]);

  // Countdown timer for OTPs
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newCountdowns = new Map<string, number>();

      activeOTPs.forEach(otp => {
        const timeLeft = Math.max(0, Math.floor((otp.expiresAt.getTime() - now.getTime()) / 1000));
        newCountdowns.set(otp.paymentId, timeLeft);
      });

      setOtpCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOTPs]);

  const fetchRetailerData = async (retailerId: string) => {
    console.log('🚀 fetchRetailerData called for retailerId:', retailerId, {
      timestamp: new Date().toISOString()
    });

    setError(null);
    setDataFetchProgress(20);

    try {
      logger.debug('Fetching retailer data for retailerId', { retailerId }, { context: 'RetailerDashboard' });

      // Get retailer user account - this contains all the data we need
      setDataFetchProgress(40);
      const retailerUserData = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
      if (!retailerUserData) {
        setError('Retailer user account not found');
        mainLoadingState.setLoading(false);
        return;
      }

      logger.debug('Retailer user data found', retailerUserData, { context: 'RetailerDashboard' });
      logger.debug('Tenant ID from user data', retailerUserData.tenantId, { context: 'RetailerDashboard' });

      // Start real-time notifications using the correct tenantId from retailer user data
      const correctTenantId = retailerUserData.tenantId;
      setNotificationTenantId(correctTenantId);
      console.log('🔔 Setting up retailer notifications with tenantId:', correctTenantId);

      // Set the user role for notifications
      notificationService.setRole('RETAILER');

      realtimeNotificationService.startListening(
        retailerId,
        'RETAILER',
        correctTenantId,
        (newNotifications) => {
          console.log('🔔 Retailer received notifications:', newNotifications.length, 'notifications');
          setNotifications(newNotifications);
          setNotificationCount(newNotifications.filter(n => !n.read).length);
        }
      );

      // Set up real-time OTP listener using secure storage
      console.log('🔔 Setting up real-time OTP listener from secure storage for retailer:', retailerId);
      const otpUnsubscribeFunc = secureOTPStorage.onOTPChanges(retailerId, (secureOTPs) => {
        console.log('🔔 Real-time OTP update detected:', {
          retailerId,
          activeOTPsFromSecureStorageCount: secureOTPs.length,
          activeOTPsFromSecureStorage: secureOTPs.map((otp) => ({
            paymentId: otp.paymentId,
            code: otp.code,
            amount: otp.amount,
            expiresAt: otp.expiresAt,
            isExpired: otp.isExpired
          }))
        });

        // Always sync all active OTPs from secure storage to ensure we have the latest data
        const validOTPsFromSecureStorage = secureOTPs.filter((otp) => !otp.isExpired);

        console.log('🔍 Valid OTPs from secure storage:', validOTPsFromSecureStorage.length);

        // Get current active OTPs to compare
        const currentActiveOTPs = getActiveOTPsForRetailer(retailerId);
        const currentPaymentIds = new Set(currentActiveOTPs.map(otp => otp.paymentId));

        // Check for OTPs that should be removed (used/expired in secure storage but still in local store)
        const secureStoragePaymentIds = new Set(validOTPsFromSecureStorage.map((otp) => otp.paymentId));
        const otpsToRemove = currentActiveOTPs.filter(otp => !secureStoragePaymentIds.has(otp.paymentId));

        if (otpsToRemove.length > 0) {
          console.log('🗑️ Removing OTPs that are no longer valid in secure storage:', otpsToRemove.length);
          otpsToRemove.forEach(otp => {
            removeActiveOTP(otp.paymentId);
          });
        }

        // Only add OTPs that we don't already have
        const newOTPs = validOTPsFromSecureStorage.filter((otp) =>
          !currentPaymentIds.has(otp.paymentId)
        );

        if (newOTPs.length > 0) {
          console.log('🆕 Adding new OTPs from real-time update:', newOTPs.length);

          // Add new OTPs to our in-memory store for display
          newOTPs.forEach((otp) => {
            addActiveOTP({
              code: otp.code,
              retailerId: retailerId,
              amount: otp.amount,
              paymentId: otp.paymentId,
              lineWorkerName: otp.lineWorkerName,
              expiresAt: otp.expiresAt,
              createdAt: otp.createdAt
            });
          });
        }

        // Refresh the active OTPs state
        const updatedActiveOTPs = getActiveOTPsForRetailer(retailerId);
        console.log('📊 Updated active OTPs count after real-time sync:', updatedActiveOTPs.length);
        setActiveOTPs(updatedActiveOTPs);

        // Show popup for the latest OTP if not already shown and not expired
        // IMPORTANT: Don't show popup if payment is already completed for this OTP
        if (validOTPsFromSecureStorage.length > 0) {
          const latestOTP = validOTPsFromSecureStorage[validOTPsFromSecureStorage.length - 1];
          const now = new Date();
          const isExpired = latestOTP.expiresAt <= now;

          // Check if this payment is already completed
          const isPaymentCompleted = completedPaymentsData.some(cp => cp.paymentId === latestOTP.paymentId);

          console.log('🔍 Checking OTP popup conditions:', {
            paymentId: latestOTP.paymentId,
            alreadyShown: shownOTPpopups.has(latestOTP.paymentId),
            isExpired,
            isPaymentCompleted,
            showOTPPopup: showOTPPopup
          });

          if (!shownOTPpopups.has(latestOTP.paymentId) && !isExpired && !isPaymentCompleted && !showOTPPopup) {
            console.log('🆕 Showing popup for new OTP:', latestOTP.paymentId);
            setNewPayment({
              ...latestOTP,
              id: latestOTP.paymentId,
              retailerId: retailerId,
              retailerName: retailerData.name || retailerUserData.name,
              lineWorkerId: '',
              totalPaid: latestOTP.amount,
              method: 'CASH' as any,
              state: 'OTP_SENT' as any,
              evidence: [],
              tenantId: retailerUserData.tenantId,
              timeline: {
                initiatedAt: { toDate: () => latestOTP.createdAt } as any,
                otpSentAt: { toDate: () => latestOTP.createdAt } as any,
              },
              createdAt: { toDate: () => latestOTP.createdAt } as any,
              updatedAt: { toDate: () => latestOTP.createdAt } as any,
            });
            setShowOTPPopup(true);

            // Add to shown popups using helper function
            addToShownOTPpopups(latestOTP.paymentId);
          } else if (isExpired) {
            console.log('⏰ Skipping expired OTP popup:', latestOTP.paymentId);
          } else if (isPaymentCompleted) {
            console.log('✅ Skipping OTP popup for completed payment:', latestOTP.paymentId);
          } else if (shownOTPpopups.has(latestOTP.paymentId)) {
            console.log('📝 Skipping already shown OTP popup:', latestOTP.paymentId);
          } else if (showOTPPopup) {
            console.log('📝 Skipping OTP popup - already showing one');
          }
        }
      });

      setOtpUnsubscribe(() => otpUnsubscribeFunc);
      console.log('🔔 Real-time OTP listener setup complete (using secure storage)');

      // Set up real-time payment completion listener
      const paymentsRef = collection(db, 'payments');
      const paymentQuery = query(paymentsRef, where('retailerId', '==', retailerId));
      const paymentUnsubscribeFunc = onSnapshot(paymentQuery, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'modified') {
            const paymentData = change.doc.data();
            const paymentId = change.doc.id;

            console.log('💰 Payment change detected:', paymentId, 'State:', paymentData.state);

            // Check if this payment was just completed
            if (paymentData.state === 'COMPLETED') {
              const completedAt = paymentData.timeline?.completedAt?.toDate();
              if (completedAt) {
                const now = new Date();
                const timeSinceCompletion = now.getTime() - completedAt.getTime();
                const fiveMinutesInMs = 5 * 60 * 1000; // Extended window to 5 minutes

                console.log('🎉 Payment completion detected:', {
                  paymentId,
                  timeSinceCompletion,
                  withinWindow: timeSinceCompletion < fiveMinutesInMs
                });

                // Only show success popup if we haven't already shown it for this payment
                if (!shownCompletedPaymentPopups.has(paymentId)) {
                  console.log('🎉 Showing success popup for completed payment:', paymentId);

                  // Close OTP popup immediately
                  setShowOTPPopup(false);

                  // Remove the OTP from active display
                  removeActiveOTP(paymentId);
                  const updatedActiveOTPs = getActiveOTPsForRetailer(retailerId);
                  setActiveOTPs(updatedActiveOTPs);

                  // Clear any new payment data to prevent OTP popup from reappearing
                  setNewPayment(null);

                  // Send notification
                  try {
                    await notificationService.sendNotification('RETAILER', {
                      type: 'payment_completed',
                      targetRole: 'retailer',
                      data: {
                        paymentId,
                        amount: paymentData.totalPaid,
                        lineWorkerName: paymentData.lineWorkerName || 'Line Worker',
                        retailerId,
                        completedAt
                      }
                    });
                    console.log('🔔 Payment completion notification sent successfully');
                  } catch (notifError) {
                    console.error('❌ Failed to send payment completion notification:', notifError);
                  }

                  // Add to completed payments list
                  const completedPayment = {
                    amount: paymentData.totalPaid,
                    paymentId: paymentId,
                    lineWorkerName: paymentData.lineWorkerName || 'Line Worker',
                    completedAt: completedAt
                  };
                  setCompletedPayments(prev => [...prev, completedPayment]);

                  // Show success popup with confetti
                  setNewCompletedPayment({
                    amount: paymentData.totalPaid,
                    paymentId: paymentId,
                    lineWorkerName: paymentData.lineWorkerName || 'Line Worker',
                    completedAt: completedAt
                  });
                  setShowSettlementPopup(true);
                  triggerConfettiWithCleanup();

                  // Close OTP popup immediately if it's open
                  setShowOTPPopup(false);
                  setNewPayment(null);

                  // Remove the OTP from active display
                  removeActiveOTP(paymentId);
                  otpBridge.removeOTP(paymentId);

                  // Add to shown completed payment popups
                  addToShownCompletedPaymentPopups(paymentId);

                  // Play success sound if available
                  try {
                    const audio = new Audio('/success-sound.mp3');
                    audio.play().catch(() => {
                      console.log('🔇 Could not play success sound');
                    });
                  } catch (error) {
                    console.log('🔇 Could not play success sound:', error);
                  }

                  // Refresh payments data to update recent transactions
                  setTimeout(() => {
                    console.log('🔄 Refreshing payments data after real-time payment completion');
                    fetchRetailerData(retailerId);
                  }, 1000);
                } else {
                  console.log('🔔 Success popup already shown for payment:', paymentId);
                }
              }
            }
          }
        });
      }, (error) => {
        console.error('Error listening to payment completions:', error);
      });

      // Store payment unsubscribe function
      setOtpUnsubscribe(() => {
        otpUnsubscribeFunc();
        paymentUnsubscribeFunc();
      });
      console.log('🔔 Real-time payment completion listener setup complete');

      // Try to get retailer details from retailers collection first
      setDataFetchProgress(60);
      let retailerData;
      try {
        const retailerRef = doc(db, 'retailers', retailerId);
        const retailerDoc = await getDoc(retailerRef);

        if (retailerDoc.exists()) {
          retailerData = {
            id: retailerId,
            ...retailerDoc.data()
          };
          logger.debug('Retailer data found in retailers collection', retailerData, { context: 'RetailerDashboard' });

          // If retailer document doesn't have address, try to get from user data
          if (!retailerData.address && retailerUserData.address) {
            retailerData.address = retailerUserData.address;
            logger.debug('Using address from retailer user data', retailerData.address, { context: 'RetailerDashboard' });
          }
        } else {
          logger.warn('Retailer document not found in retailers collection, using user data', { context: 'RetailerDashboard' });
          // Fallback to user data
          retailerData = {
            id: retailerUserData.retailerId,
            name: retailerUserData.name,
            phone: retailerUserData.phone,
            email: retailerUserData.email || '',
            tenantId: retailerUserData.tenantId,
            address: retailerUserData.address || 'Address not specified',
            areaId: '',
            zipcodes: []
          };
        }
      } catch (error) {
        logger.error('Error accessing retailers collection, using user data', error, { context: 'RetailerDashboard' });
        // Fallback to user data
        retailerData = {
          id: retailerUserData.retailerId,
          name: retailerUserData.name,
          phone: retailerUserData.phone,
          email: retailerUserData.email || '',
          tenantId: retailerUserData.tenantId,
          address: retailerUserData.address || 'Address not specified',
          areaId: '',
          zipcodes: []
        };
      }

      // Get payment history - fetch consolidated data from all tenants
      setDataFetchProgress(80);
      const paymentsData = await paymentService.getPaymentsByRetailerAcrossAllTenants(retailerUserData.retailerId);

      logger.debug('Payments data fetched', paymentsData, { context: 'RetailerDashboard' });

      // Set state with fetched data
      setRetailer(retailerData);
      setRetailerUser(retailerUserData);

      // Fetch retailer profile
      try {
        const profileData = await RetailerProfileService.getRetailerProfile(retailerId);
        console.log('📋 Retailer profile fetched:', profileData);
        setRetailerProfile(profileData);
      } catch (profileError) {
        console.error('❌ Error fetching retailer profile:', profileError);
        // Continue without profile data
        setRetailerProfile(null);
      }

      // Handle multi-tenant support
      const retailerTenants = retailerData.tenantIds || [retailerUserData.tenantId];
      console.log('🏪 Retailer Multi-Tenant Data:', {
        retailerId: retailerData.id,
        retailerName: retailerData.name,
        tenantIds: retailerData.tenantIds,
        userTenantId: retailerUserData.tenantId,
        finalTenants: retailerTenants
      });
      setAvailableTenants(retailerTenants);

      // Set current tenantId to 'all' for consolidated view by default
      setTenantId('all');

      setPayments(paymentsData);

      console.log('🔍 IMPORTANT: Retailer ID Mapping Check:', {
        'user.retailerId': user?.retailerId,
        'localStorage.retailerId': localStorage.getItem('retailerId'),
        'retailerUserData.retailerId': retailerUserData.retailerId,
        'retailerData.id (used for OTP sync)': retailerData.id,
        'retailerId parameter passed to function': retailerId
      });

      // Load active OTPs and completed payments from in-memory store
      // First sync from secure storage to get the latest OTPs
      const activeOTPsData = await otpBridge.syncOTPsToRetailerDashboard(retailerId);
      const completedPaymentsData = getCompletedPaymentsForRetailer(retailerId);

      console.log('🔍 Loaded data from in-memory store:', {
        activeOTPsCount: activeOTPsData.length,
        completedPaymentsCount: completedPaymentsData.length,
        activeOTPs: activeOTPsData.map(otp => ({
          paymentId: otp.paymentId,
          code: otp.code,
          amount: otp.amount,
          expiresAt: otp.expiresAt.toISOString()
        }))
      });

      // Also check secure storage for any OTPs that might not be in the in-memory store yet
      try {
        console.log('🔄 Checking secure storage for OTPs during initial load', {
          retailerId,
          timestamp: new Date().toISOString()
        });

        // Get OTPs from secure storage instead of retailer document
        const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);

        console.log('🔍 Secure storage OTP check during initial load:', {
          activeOTPsFromSecureStorageCount: secureOTPs.length,
          activeOTPsFromSecureStorage: secureOTPs.map(otp => ({
            paymentId: otp.paymentId,
            code: otp.code,
            amount: otp.amount,
            expiresAt: otp.expiresAt,
            isExpired: otp.isExpired
          }))
        });

        // Check if there are new OTPs that aren't in our current activeOTPs state
        const currentPaymentIds = new Set(activeOTPsData.map(otp => otp.paymentId));
        const newOTPsFromSecureStorage = secureOTPs.filter(otp => {
          // Check if OTP is not expired and not already in our state
          return !otp.isExpired && !currentPaymentIds.has(otp.paymentId);
        });

        if (newOTPsFromSecureStorage.length > 0) {
          console.log('🆕 New OTPs found during initial load:', newOTPsFromSecureStorage.length);

          // Add new OTPs to our in-memory store for display
          newOTPsFromSecureStorage.forEach((otp) => {
            addActiveOTP({
              code: otp.code,
              retailerId: retailerId,
              amount: otp.amount,
              paymentId: otp.paymentId,
              lineWorkerName: otp.lineWorkerName,
              expiresAt: otp.expiresAt,
              createdAt: otp.createdAt
            });
          });

          // Refresh the active OTPs data after adding new ones
          const updatedActiveOTPsData = getActiveOTPsForRetailer(retailerId);
          console.log('📊 Updated active OTPs count after secure storage sync:', updatedActiveOTPsData.length);
          setActiveOTPs(updatedActiveOTPsData);
        } else {
          console.log('📝 No new OTPs found in secure storage, using in-memory store data');
          setActiveOTPs(activeOTPsData);
        }
      } catch (error) {
        console.error('❌ Error checking secure storage for OTPs during initial load:', error);
        console.log('📝 Falling back to in-memory store data due to error');
        setActiveOTPs(activeOTPsData);
      }
      setCompletedPayments(completedPaymentsData);

      // Check for new OTPs and show popup (use the updated activeOTPs state)
      // Add a small delay to ensure shownOTPpopups is fully initialized
      setTimeout(() => {
        const finalActiveOTPs = getActiveOTPsForRetailer(retailerId);
        console.log('🔍 Checking for new OTPs after data fetch:', {
          finalActiveOTPs: finalActiveOTPs.length,
          shownOTPpopups: shownOTPpopups.size,
          paymentIds: finalActiveOTPs.map(otp => otp.paymentId)
        });

        const newOTPs = finalActiveOTPs.filter(otp => {
          const alreadyShown = shownOTPpopups.has(otp.paymentId);
          console.log(`📝 OTP ${otp.paymentId} already shown:`, alreadyShown);
          return !alreadyShown;
        });

        if (newOTPs.length > 0) {
          const latestOTP = newOTPs[newOTPs.length - 1];
          console.log('🆕 Showing popup for new OTP found after data fetch:', latestOTP.paymentId);
          setNewPayment({
            ...latestOTP,
            id: latestOTP.paymentId,
            retailerId: retailerId,
            retailerName: retailerData.name,
            lineWorkerId: '',
            totalPaid: latestOTP.amount,
            method: 'CASH' as any,
            state: 'OTP_SENT' as any,
            evidence: [],
            tenantId: retailerData.tenantId || '',
            timeline: {
              initiatedAt: { toDate: () => latestOTP.createdAt } as any,
              otpSentAt: { toDate: () => latestOTP.createdAt } as any,
            },
            createdAt: { toDate: () => latestOTP.createdAt } as any,
            updatedAt: { toDate: () => latestOTP.createdAt } as any,
          });
          setShowOTPPopup(true);

          // Add to shown popups using the helper function
          addToShownOTPpopups(latestOTP.paymentId);
        } else {
          console.log('📝 No new OTPs to show after data fetch');
        }
      }, 200); // Small delay to ensure state is settled

      // Check for new completed payments and show settlement popup
      const newCompleted = completedPaymentsData.filter(cp => !shownCompletedPaymentPopups.has(cp.paymentId));
      if (newCompleted.length > 0) {
        const latestCompleted = newCompleted[newCompleted.length - 1];
        setNewCompletedPayment(latestCompleted);
        setShowSettlementPopup(true);
        triggerConfettiWithCleanup();

        // Add to shown completed payment popups
        addToShownCompletedPaymentPopups(latestCompleted.paymentId);
      }

      setDataFetchProgress(100);
      mainLoadingState.setLoading(false);

      logger.debug('✅ Retailer data loaded successfully', { context: 'RetailerDashboard' });
    } catch (err: any) {
      console.error('Error fetching retailer data:', err);
      setError(err.message || 'Failed to fetch retailer data');
      mainLoadingState.setLoading(false);
    }
  };

  const refreshData = async () => {
    mainLoadingState.setRefreshing(true);
    try {
      if (retailer?.id) {
        await fetchRetailerData(retailer.id);

        // Also manually check for new OTPs from secure storage
        if (retailer?.id && tenantId) {
          console.log('🔄 Manually checking for new OTPs from secure storage');
          try {
            // Get OTPs from secure storage instead of retailer document
            const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailer.id);

            console.log('🔍 Manual OTP check found:', {
              activeOTPsFromSecureStorageCount: secureOTPs.length,
              activeOTPsFromSecureStorage: secureOTPs.map(otp => ({
                paymentId: otp.paymentId,
                code: otp.code,
                amount: otp.amount,
                expiresAt: otp.expiresAt,
                isExpired: otp.isExpired
              }))
            });

            // Check if there are new OTPs that aren't in our current activeOTPs state
            const currentPaymentIds = new Set(activeOTPs.map(otp => otp.paymentId));
            const newOTPsFromSecureStorage = secureOTPs.filter(otp => {
              // Check if OTP is not expired and not already in our state
              return !otp.isExpired && !currentPaymentIds.has(otp.paymentId);
            });

            if (newOTPsFromSecureStorage.length > 0) {
              console.log('🆕 New OTPs found during manual refresh:', newOTPsFromSecureStorage.length);

              // Add new OTPs to our in-memory store for display
              newOTPsFromSecureStorage.forEach((otp) => {
                addActiveOTP({
                  code: otp.code,
                  retailerId: retailer.id,
                  amount: otp.amount,
                  paymentId: otp.paymentId,
                  lineWorkerName: otp.lineWorkerName,
                  expiresAt: otp.expiresAt,
                  createdAt: otp.createdAt
                });
              });

              // Refresh the active OTPs state
              const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
              setActiveOTPs(updatedActiveOTPs);

              // Show popup for the latest OTP
              const latestOTP = newOTPsFromSecureStorage[newOTPsFromSecureStorage.length - 1];
              if (!shownOTPpopups.has(latestOTP.paymentId)) {
                setNewPayment({
                  ...latestOTP,
                  id: latestOTP.paymentId,
                  retailerId: retailer.id,
                  retailerName: retailer.name || retailerUser?.name,
                  lineWorkerId: '',
                  totalPaid: latestOTP.amount,
                  method: 'CASH' as any,
                  state: 'OTP_SENT' as any,
                  evidence: [],
                  tenantId: tenantId,
                  timeline: {
                    initiatedAt: { toDate: () => latestOTP.createdAt } as any,
                    otpSentAt: { toDate: () => latestOTP.createdAt } as any,
                  },
                  createdAt: { toDate: () => latestOTP.createdAt } as any,
                  updatedAt: { toDate: () => latestOTP.createdAt } as any,
                });
                setShowOTPPopup(true);

                // Add to shown popups
                setShownOTPpopups(prev => new Set(prev).add(latestOTP.paymentId));
              }
            }
          } catch (error) {
            console.error('Error manually checking for OTPs:', error);
          }
        }
      }
    } finally {
      mainLoadingState.setRefreshing(false);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  // Enhanced receipt functions
  const openReceiptDialog = (payment: Payment) => {
    setSelectedPaymentForReceipt(payment);
    setShowReceiptDialog(true);
  };

  const closeReceiptDialog = () => {
    setShowReceiptDialog(false);
    setSelectedPaymentForReceipt(null);
  };

  // Calculate statistics
  const completedPaymentsList = payments.filter(p => p.state === 'COMPLETED');
  const totalPaid = completedPaymentsList.reduce((sum, p) => sum + p.totalPaid, 0);
  const todayPayments = filterPaymentsByDateRange(completedPaymentsList);
  const todayPaid = todayPayments.reduce((sum, p) => sum + p.totalPaid, 0);

  // Filter payments based on selected tab
  const filteredPayments = payments.filter(payment => {
    const paymentDate = payment.createdAt.toDate();
    const isInDateRange = paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;

    if (paymentTab === 'completed') {
      return payment.state === 'COMPLETED' && isInDateRange;
    } else if (paymentTab === 'pending') {
      return (payment.state === 'INITIATED' || payment.state === 'OTP_SENT') && isInDateRange;
    }
    return isInDateRange;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <StatusBarColor theme="blue" />
      <Confetti trigger={triggerConfetti} />

      {/* Top Navigation */}
      <DashboardNavigation
        navItems={navItems}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        title={activeNav === 'overview' ? 'Retailer Dashboard' :
          activeNav === 'payments' ? 'Payment History' :
            activeNav === 'settings' ? 'Settings' : 'Retailer Dashboard'}
        subtitle="Retailer"
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={() => setShowLogoutConfirmation(true)}
        notificationCount={notificationCount}
        notifications={notifications}
        onNotificationRead={markNotificationAsRead}
        onAllNotificationsRead={markAllNotificationsAsRead}
        hasFixedSelector={availableTenants.length > 1}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation
        open={showLogoutConfirmation}
        onOpenChange={setShowLogoutConfirmation}
        onConfirm={logout}
        userName={user?.displayName || user?.email}
      />

      {/* Wholesaler Selector - Full Width Below Navigation */}
      {availableTenants.length > 1 && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <Store className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <Select value={tenantId || 'all'} onValueChange={handleTenantSwitch}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select wholesaler">
                      {tenantId === 'all' ? '🏢 All Wholesalers' : (wholesalerNames[tenantId || ''] || 'Loading...')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      🏢 All Wholesalers
                    </SelectItem>
                    {availableTenants.map((tenantIdOption) => (
                      <SelectItem key={tenantIdOption} value={tenantIdOption}>
                        {wholesalerNames[tenantIdOption] || 'Loading...'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`${availableTenants.length > 1 ? 'pt-20 sm:pt-20 lg:pt-0' : 'pt-20 sm:pt-20 lg:pt-0'} pb-20 lg:pb-0`}> {/* Further reduced mobile spacing to match desktop */}
        <div className="p-4 sm:p-6">
          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading Overlay */}
          <LoadingOverlay
            isLoading={mainLoadingState.loadingState.isLoading}
            progress={dataFetchProgress}
            message="Loading retailer data..."
          />

          {/* Dashboard Content */}
          {!mainLoadingState.loadingState.isLoading && retailer && (
            <>
              {/* Overview Stats */}
              {activeNav === 'overview' && (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-100">Today's Payments</CardTitle>
                        <div className="bg-white/20 p-2 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(todayPaid)}</div>
                        <p className="text-xs text-emerald-100 mt-1">{todayPayments.length} transactions</p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100">Total Paid</CardTitle>
                        <div className="bg-white/20 p-2 rounded-lg">
                          <DollarSign className="h-4 w-4 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalPaid)}</div>
                        <p className="text-xs text-blue-100 mt-1">All time</p>
                      </CardContent>
                    </Card>

                    {/* Wholesaler Slider - Spanning full width on mobile if needed, or keeping in flow */}
                    <div className="col-span-2">
                      <WholesalerSlider
                        wholesalerNames={wholesalerNames}
                        availableTenants={availableTenants}
                        currentTenantId={tenantId}
                      />
                    </div>
                  </div>



                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Payment Activity</CardTitle>
                      <CardDescription>Your latest payment transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {completedPaymentsList
                          .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
                          .slice(0, 5)
                          .map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                                <div className="text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">{payment.method}</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openReceiptDialog(payment)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Receipt
                                </Button>
                              </div>
                            </div>
                          ))}
                        {completedPaymentsList.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No payment activity yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* PWA Notification Manager */}
                  {/* <PWANotificationManager userRole="RETAILER" /> */}
                </div>
              )}

              {/* Payments View */}
              {activeNav === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between sm:pt-8">
                    <h2 className="text-xl font-semibold">Payment Transactions</h2>
                  </div>

                  <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                    <TabsList>
                      <TabsTrigger value="completed">Completed ({completedPaymentsList.length})</TabsTrigger>
                      <TabsTrigger value="pending">Pending ({activeOTPs.length})</TabsTrigger>
                      <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value={paymentTab} className="space-y-4">
                      <DateRangeFilter
                        value={selectedDateRangeOption}
                        onValueChange={handleDateRangeChange}
                      />

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Wholesaler</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Line Worker</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPayments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                                <TableCell>{formatCurrency(payment.totalPaid)}</TableCell>
                                <TableCell>{payment.method}</TableCell>
                                <TableCell>
                                  <WholesalerNameCell tenantId={payment.tenantId || payment.tenantIds?.[0] || ''} />
                                </TableCell>
                                <TableCell>
                                  <PaymentStatusCell state={payment.state} />
                                </TableCell>
                                <TableCell>{lineWorkerNames[payment.lineWorkerId] || 'Loading...'}</TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openReceiptDialog(payment)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      View Receipt
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filteredPayments.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                  No payments found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Settings View */}
              {activeNav === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold sm:pt-8">Settings</h2>

                  {/* Profile Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Business Profile
                      </CardTitle>
                      <CardDescription>
                        Manage your business information and profile details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {retailerProfile && retailerProfile.profile ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Business Name</Label>
                              <p className="text-gray-900">{retailerProfile.profile.realName || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                              <p className="text-gray-900">+91 {retailerProfile.profile.phone || retailer?.phone}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Email</Label>
                              <p className="text-gray-900">{retailerProfile.profile.email || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Business Type</Label>
                              <p className="text-gray-900">{retailerProfile.profile.businessType || 'Not set'}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Address</Label>
                            <p className="text-gray-900">{retailerProfile.profile.address || 'Not set'}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            {retailerProfile.verification?.isPhoneVerified && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Phone Verified
                              </Badge>
                            )}
                            {retailerProfile.profile.licenseNumber && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                License Registered
                              </Badge>
                            )}
                          </div>
                          <div className="pt-2">
                            <RetailerProfileEdit
                              retailerId={retailer!.id}
                              profile={{
                                realName: retailerProfile.profile.realName || '',
                                email: retailerProfile.profile.email || '',
                                address: retailerProfile.profile.address || '',
                                businessType: retailerProfile.profile.businessType || '',
                                licenseNumber: retailerProfile.profile.licenseNumber || '',
                                phone: retailerProfile.profile.phone || retailer?.phone || '',
                                isPhoneVerified: retailerProfile.verification?.isPhoneVerified || false,
                                verifiedAt: retailerProfile.verification?.verifiedAt
                              }}
                              onProfileUpdate={handleProfileUpdate}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="bg-gray-50 rounded-lg p-6">
                            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Complete</h3>
                            <p className="text-gray-600 mb-4">
                              Your business profile is incomplete. Complete your profile to get the best experience.
                            </p>
                            <Button
                              onClick={() => {
                                // Navigate to profile completion
                                window.location.href = `/retailer-login?completeProfile=true&phone=${retailer?.phone}`;
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Complete Profile
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notification Managers */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* PWA Notification Manager */}
                    <PWANotificationManager userRole="RETAILER" />
                  </div>

                  {/* Notification De-duplicator Debug */}
                  {/* <NotificationDeduplicatorDebug /> */}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* OTP Verification Popup */}
      <Dialog open={showOTPPopup} onOpenChange={(open) => {
        if (!open) {
          // Dialog is being closed, clean up state
          setShowOTPPopup(false);
          setNewPayment(null);
        } else {
          setShowOTPPopup(true);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              Payment Verification Required
            </DialogTitle>
            <DialogDescription>
              A line worker is requesting payment verification. Please confirm the OTP below.
            </DialogDescription>
          </DialogHeader>
          {newPayment && (
            <div className="space-y-4">
              {/* Countdown Timer */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm opacity-90">OTP Expires In</div>
                    <div className="text-2xl font-bold">
                      {formatCountdown(otpCountdowns.get(newPayment.id) || 0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-90">Amount</div>
                    <div className="text-xl font-bold">{formatCurrency(newPayment.totalPaid)}</div>
                  </div>
                </div>
              </div>

              {/* OTP Code Display */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">Your OTP Code</div>
                <div className="text-4xl font-mono font-bold text-blue-600 tracking-wider">
                  {activeOTPs.find(otp => otp.paymentId === newPayment.id)?.code}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Inform OTP to line worker only after verifying the paying amount is correct
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Line Worker:</span>
                  <span className="font-medium">{newPayment.retailerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Payment ID:</span>
                  <span className="font-mono text-sm">{newPayment.id}</span>
                </div>
              </div>

              {/* Action Buttons - Only Close button for retailer */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOTPPopup(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Completed Popup */}
      <Dialog open={showSettlementPopup} onOpenChange={(open) => {
        if (!open) {
          // Dialog is being closed, clean up state
          setShowSettlementPopup(false);
          setShowOTPPopup(false); // Ensure OTP popup is also closed
          setNewCompletedPayment(null);
          setNewPayment(null);
        } else {
          setShowSettlementPopup(true);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Completed Successfully!</DialogTitle>
            <DialogDescription>
              Your payment has been verified and processed
            </DialogDescription>
          </DialogHeader>
          {newCompletedPayment && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Amount Paid:</span>
                  <span className="font-bold text-green-600">{formatCurrency(newCompletedPayment.amount)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Collected By:</span>
                  <span className="font-medium">{newCompletedPayment.lineWorkerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Completed At:</span>
                  <span className="font-medium">{formatTimestampWithTime({ toDate: () => newCompletedPayment.completedAt } as any)}</span>
                </div>
              </div>

              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-green-700 font-medium">Payment successful! Thank you for your payment.</p>
              </div>

              <Button
                onClick={() => {
                  // Close payment success popup
                  setShowSettlementPopup(false);

                  // Ensure OTP popup is also closed
                  setShowOTPPopup(false);

                  // Clear the completed payment data
                  setNewCompletedPayment(null);

                  // Clear any new payment data
                  setNewPayment(null);

                  // Refresh dashboard data when closing the popup
                  setTimeout(() => {
                    console.log('🔄 Refreshing dashboard data after closing payment completion popup');
                    if (retailer) {
                      fetchRetailerData(retailer.id);
                    }
                  }, 500);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Receipt Dialog */}
      {selectedPaymentForReceipt && (
        <EnhancedReceipt
          payment={selectedPaymentForReceipt}
          retailer={retailer}
          wholesalerNames={wholesalerNames}
          lineWorkerNames={lineWorkerNames}
          tenantId={selectedPaymentForReceipt.tenantIds?.[0] || tenantId}
          isOpen={showReceiptDialog}
          onClose={closeReceiptDialog}
        />
      )}

      {/* Floating Report Button */}
      {retailer && <ReportDialog retailerId={retailer.id} retailerPhone={retailer.phone} />}
    </div>
  );
}