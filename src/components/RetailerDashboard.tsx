'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardNavigation, NavItem } from '@/components/DashboardNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { retailerService, paymentService, otpService } from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { RetailerAuthService } from '@/services/retailer-auth';
import { Retailer, Payment } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { getActiveOTPsForRetailer, getCompletedPaymentsForRetailer, removeCompletedPayment, addActiveOTP, removeActiveOTP } from '@/lib/otp-store';
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
  Heart
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';
import { Confetti } from './ui/Confetti';

export function RetailerDashboard() {
  const { user, logout } = useAuth();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [retailerUser, setRetailerUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
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
  const [newPayment, setNewPayment] = useState<Payment | null>(null);
  const [newCompletedPayment, setNewCompletedPayment] = useState<{
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    completedAt: Date;
  } | null>(null);
  const [shownOTPpopups, setShownOTPpopups] = useState<Set<string>>(new Set());
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
  
  // Manual refresh function for OTP data
  const refreshOTPData = async () => {
    if (!retailer || !tenantId) return;
    
    try {
      console.log('🔄 Manual OTP refresh triggered', {
        retailerId: retailer.id,
        timestamp: new Date().toISOString()
      });
      
      const retailerRef = doc(db, 'retailers', retailer.id);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        const retailerData = retailerDoc.data();
        const activeOTPsFromFirestore = retailerData.activeOTPs || [];
        
        console.log('🔄 OTP refresh data from Firestore:', {
          activeOTPsFromFirestoreCount: activeOTPsFromFirestore.length
        });
        
        // Filter valid OTPs
        const validOTPsFromFirestore = activeOTPsFromFirestore.filter((otp: any) => {
          const expiresAt = otp.expiresAt.toDate();
          const isExpired = expiresAt <= new Date();
          return !isExpired && !otp.isUsed;
        });
        
        // Get current active OTPs to compare
        const currentActiveOTPs = getActiveOTPsForRetailer(retailer.id);
        const currentPaymentIds = new Set(currentActiveOTPs.map(otp => otp.paymentId));
        
        // Only add OTPs that we don't already have
        const newOTPs = validOTPsFromFirestore.filter((otp: any) => 
          !currentPaymentIds.has(otp.paymentId)
        );
        
        if (newOTPs.length > 0) {
          console.log('🆕 Adding new OTPs from manual refresh:', newOTPs.length);
          
          // Add new OTPs to our in-memory store for display
          newOTPs.forEach((otp: any) => {
            addActiveOTP({
              code: otp.code,
              retailerId: retailer.id,
              amount: otp.amount,
              paymentId: otp.paymentId,
              lineWorkerName: otp.lineWorkerName,
              expiresAt: otp.expiresAt.toDate(),
              createdAt: otp.createdAt.toDate()
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
            setShownOTPpopups(prev => new Set(prev).add(latestOTP.paymentId));
          }
        } else {
          console.log('📝 No new OTPs found during manual refresh');
        }
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

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'History', icon: History },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  // Helper functions to get additional data
  const [wholesalerNames, setWholesalerNames] = useState<Record<string, string>>({});
  const [lineWorkerNames, setLineWorkerNames] = useState<Record<string, string>>({});

  // Get wholesaler/tenant name by tenantId
  const getWholesalerName = async (tenantId: string): Promise<string> => {
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

  // Get line worker name by userId
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

  // Load all necessary data
  const loadAdditionalData = async () => {
    if (!tenantId || !payments.length) return;
    
    // Get unique tenantIds and lineWorkerIds
    const uniqueTenantIds = new Set<string>();
    const uniqueLineWorkerIds = new Set<string>();
    
    // Add tenantId
    if (tenantId) {
      uniqueTenantIds.add(tenantId);
    }
    
    // Add lineWorkerIds from payments
    payments.forEach(payment => {
      if (payment.lineWorkerId) {
        uniqueLineWorkerIds.add(payment.lineWorkerId);
      }
    });
    
    // Fetch wholesaler names
    for (const tenantId of uniqueTenantIds) {
      await getWholesalerName(tenantId);
    }
    
    // Fetch line worker names
    for (const lineWorkerId of uniqueLineWorkerIds) {
      await getLineWorkerName(lineWorkerId);
    }
  };

  useEffect(() => {
    console.log('🔄 RetailerDashboard useEffect triggered', {
      hasUser: !!user,
      userId: user?.uid,
      retailerId: user?.retailerId,
      timestamp: new Date().toISOString()
    });
    
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
        realtimeNotificationService.stopListening(retailerId);
      }
      
      // Clean up OTP listener
      if (otpUnsubscribe) {
        otpUnsubscribe();
        setOtpUnsubscribe(null);
      }
    };
  }, [user]);

  // Backup initialization for manual browser refresh - runs once on component mount
  useEffect(() => {
    console.log('🔄 RetailerDashboard mount useEffect triggered (backup initialization)', {
      timestamp: new Date().toISOString()
    });
    
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
        }
      }, 5000); // Check every 5 seconds as a fallback

      return () => clearInterval(refreshInterval);
    }
  }, [retailer, tenantId, mainLoadingState.loadingState.isLoading]);

  // Check for completed payments and close OTP popup if needed
  const checkCompletedPayments = async () => {
    if (!retailer || !tenantId) return; // Removed !showOTPPopup condition
    
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
        return timeSinceCompletion < 60000; // Within last minute
      });
      
      if (recentCompletedPayments.length > 0) {
        console.log('🔍 Found recent completed payments:', recentCompletedPayments.length);
        
        // Close OTP popup if it's open
        setShowOTPPopup(false);
        
        // Remove OTPs from active display for completed payments
        recentCompletedPayments.forEach(payment => {
          removeActiveOTP(payment.id);
        });
        
        const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
        setActiveOTPs(updatedActiveOTPs);
        
        // Show success popup for the most recent completion
        const latestPayment = recentCompletedPayments[recentCompletedPayments.length - 1];
        if (!shownOTPpopups.has(latestPayment.id)) {
          setNewCompletedPayment({
            amount: latestPayment.totalPaid || 0,
            paymentId: latestPayment.id,
            lineWorkerName: 'Line Worker', // We'll fetch this separately if needed
            completedAt: latestPayment.completedAt
          });
          setShowSettlementPopup(true);
          setTriggerConfetti(true);
          
          // Add to shown popups
          setShownOTPpopups(prev => new Set(prev).add(latestPayment.id));
          
          // Hide confetti after 5 seconds
          setTimeout(() => {
            setTriggerConfetti(false);
          }, 5000);
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
      
      // Set up real-time OTP listener for retailer document
      const retailerRef = doc(db, 'retailers', retailerId);
      const otpUnsubscribeFunc = onSnapshot(retailerRef, (snapshot) => {
        console.log('🔔 Real-time retailer document update detected:', {
          retailerId,
          exists: snapshot.exists(),
          timestamp: new Date().toISOString()
        });
        
        if (snapshot.exists()) {
          const retailerData = snapshot.data();
          const activeOTPsFromFirestore = retailerData.activeOTPs || [];
          
          console.log('🔔 Real-time OTP update detected:', {
            retailerId,
            activeOTPsFromFirestoreCount: activeOTPsFromFirestore.length,
            activeOTPsFromFirestore: activeOTPsFromFirestore.map((otp: any) => ({
              paymentId: otp.paymentId,
              code: otp.code,
              amount: otp.amount,
              expiresAt: otp.expiresAt.toDate(),
              isUsed: otp.isUsed,
              isExpired: otp.expiresAt.toDate() <= new Date()
            }))
          });
          
          // Always sync all active OTPs from Firestore to ensure we have the latest data
          const validOTPsFromFirestore = activeOTPsFromFirestore.filter((otp: any) => {
            const expiresAt = otp.expiresAt.toDate();
            const isExpired = expiresAt <= new Date();
            return !isExpired && !otp.isUsed;
          });
          
          console.log('🔍 Valid OTPs from Firestore:', validOTPsFromFirestore.length);
          
          // Get current active OTPs to compare
          const currentActiveOTPs = getActiveOTPsForRetailer(retailerId);
          const currentPaymentIds = new Set(currentActiveOTPs.map(otp => otp.paymentId));
          
          // Only add OTPs that we don't already have
          const newOTPs = validOTPsFromFirestore.filter((otp: any) => 
            !currentPaymentIds.has(otp.paymentId)
          );
          
          if (newOTPs.length > 0) {
            console.log('🆕 Adding new OTPs from real-time update:', newOTPs.length);
            
            // Add new OTPs to our in-memory store for display
            newOTPs.forEach((otp: any) => {
              addActiveOTP({
                code: otp.code,
                retailerId: retailerId,
                amount: otp.amount,
                paymentId: otp.paymentId,
                lineWorkerName: otp.lineWorkerName,
                expiresAt: otp.expiresAt.toDate(),
                createdAt: otp.createdAt.toDate()
              });
            });
          }
          
          // Refresh the active OTPs state
          const updatedActiveOTPs = getActiveOTPsForRetailer(retailerId);
          console.log('📊 Updated active OTPs count after real-time sync:', updatedActiveOTPs.length);
          setActiveOTPs(updatedActiveOTPs);
          
          // Show popup for the latest OTP if not already shown
          if (validOTPsFromFirestore.length > 0) {
            const latestOTP = validOTPsFromFirestore[validOTPsFromFirestore.length - 1];
            if (!shownOTPpopups.has(latestOTP.paymentId)) {
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
                  initiatedAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                  otpSentAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                },
                createdAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                updatedAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
              });
              setShowOTPPopup(true);
              
              // Add to shown popups
              setShownOTPpopups(prev => new Set(prev).add(latestOTP.paymentId));
            }
          }
        }
      }, (error) => {
        console.error('Error listening to retailer document for OTPs:', error);
      });
      
      setOtpUnsubscribe(() => otpUnsubscribeFunc);
      console.log('🔔 Real-time OTP listener setup complete');
      
      // Set up real-time payment completion listener
      const paymentsRef = collection(db, 'payments');
      const paymentQuery = query(paymentsRef, where('retailerId', '==', retailerId));
      const paymentUnsubscribeFunc = onSnapshot(paymentQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
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
                const thirtySecondsInMs = 30 * 1000; // Extended window to 30 seconds
                
                console.log('🎉 Payment completion detected:', {
                  paymentId,
                  timeSinceCompletion,
                  withinWindow: timeSinceCompletion < thirtySecondsInMs
                });
                
                if (timeSinceCompletion < thirtySecondsInMs) {
                  console.log('🎉 Recent payment completion detected, closing OTP popup and showing success');
                  
                  // Close OTP popup if it's open
                  setShowOTPPopup(false);
                  
                  // Remove the OTP from active display
                  removeActiveOTP(paymentId);
                  const updatedActiveOTPs = getActiveOTPsForRetailer(retailerId);
                  setActiveOTPs(updatedActiveOTPs);
                  
                  // Show success popup with confetti
                  setNewCompletedPayment({
                    amount: paymentData.totalPaid,
                    paymentId: paymentId,
                    lineWorkerName: paymentData.lineWorkerName || 'Line Worker',
                    completedAt: completedAt
                  });
                  setShowSettlementPopup(true);
                  setTriggerConfetti(true);
                  
                  // Play success sound if available
                  try {
                    const audio = new Audio('/success-sound.mp3');
                    audio.play().catch(() => {
                      console.log('🔇 Could not play success sound');
                    });
                  } catch (error) {
                    console.log('🔇 Could not play success sound:', error);
                  }
                  
                  // Hide confetti after 5 seconds
                  setTimeout(() => {
                    setTriggerConfetti(false);
                  }, 5000);
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
      
      // Get payment history using the tenantId and retailerId from user data
      setDataFetchProgress(80);
      const paymentsData = await paymentService.getPaymentsByRetailer(retailerUserData.tenantId, retailerUserData.retailerId);
      
      logger.debug('Payments data fetched', paymentsData, { context: 'RetailerDashboard' });
      
      // Set state with fetched data
      setRetailer(retailerData);
      setRetailerUser(retailerUserData);
      setTenantId(retailerUserData.tenantId);
      setPayments(paymentsData);
      
      // Load active OTPs and completed payments from in-memory store
      const activeOTPsData = getActiveOTPsForRetailer(retailerId);
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
      
      // Also check Firestore for any OTPs that might not be in the in-memory store yet
      try {
        console.log('🔄 Checking Firestore for OTPs during initial load', {
          retailerId,
          timestamp: new Date().toISOString()
        });
        const retailerRef = doc(db, 'retailers', retailerId);
        const retailerDoc = await getDoc(retailerRef);
        
        if (retailerDoc.exists()) {
          const retailerData = retailerDoc.data();
          const activeOTPsFromFirestore = retailerData.activeOTPs || [];
          
          console.log('🔍 Firestore OTP check during initial load:', {
            activeOTPsFromFirestoreCount: activeOTPsFromFirestore.length,
            activeOTPsFromFirestore: activeOTPsFromFirestore.map((otp: any) => ({
              paymentId: otp.paymentId,
              code: otp.code,
              amount: otp.amount,
              expiresAt: otp.expiresAt.toDate(),
              isUsed: otp.isUsed,
              isExpired: otp.expiresAt.toDate() <= new Date()
            }))
          });
          
          // Check if there are new OTPs that aren't in our current activeOTPs state
          const currentPaymentIds = new Set(activeOTPsData.map(otp => otp.paymentId));
          const newOTPsFromFirestore = activeOTPsFromFirestore.filter((otp: any) => {
            // Check if OTP is not expired and not already in our state
            const expiresAt = otp.expiresAt.toDate();
            const isExpired = expiresAt <= new Date();
            return !isExpired && !currentPaymentIds.has(otp.paymentId) && !otp.isUsed;
          });
          
          if (newOTPsFromFirestore.length > 0) {
            console.log('🆕 New OTPs found during initial load:', newOTPsFromFirestore.length);
            
            // Add new OTPs to our in-memory store for display
            newOTPsFromFirestore.forEach((otp: any) => {
              addActiveOTP({
                code: otp.code,
                retailerId: retailerId,
                amount: otp.amount,
                paymentId: otp.paymentId,
                lineWorkerName: otp.lineWorkerName,
                expiresAt: otp.expiresAt.toDate(),
                createdAt: otp.createdAt.toDate()
              });
            });
            
            // Refresh the active OTPs data after adding new ones
            const updatedActiveOTPsData = getActiveOTPsForRetailer(retailerId);
            console.log('📊 Updated active OTPs count after Firestore sync:', updatedActiveOTPsData.length);
            setActiveOTPs(updatedActiveOTPsData);
          } else {
            console.log('📝 No new OTPs found in Firestore, using in-memory store data');
            setActiveOTPs(activeOTPsData);
          }
        } else {
          console.log('⚠️ Retailer document not found in Firestore, using in-memory store data');
          setActiveOTPs(activeOTPsData);
        }
      } catch (error) {
        console.error('❌ Error checking Firestore for OTPs during initial load:', error);
        console.log('📝 Falling back to in-memory store data due to error');
        setActiveOTPs(activeOTPsData);
      }
      setCompletedPayments(completedPaymentsData);
      
      // Check for new OTPs and show popup (use the updated activeOTPs state)
      const finalActiveOTPs = getActiveOTPsForRetailer(retailerId);
      const newOTPs = finalActiveOTPs.filter(otp => !shownOTPpopups.has(otp.paymentId));
      if (newOTPs.length > 0) {
        const latestOTP = newOTPs[newOTPs.length - 1];
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
        
        // Add to shown popups
        setShownOTPpopups(prev => new Set(prev).add(latestOTP.paymentId));
      }
      
      // Check for new completed payments and show settlement popup
      const newCompleted = completedPaymentsData.filter(cp => !shownOTPpopups.has(cp.paymentId));
      if (newCompleted.length > 0) {
        const latestCompleted = newCompleted[newCompleted.length - 1];
        setNewCompletedPayment(latestCompleted);
        setShowSettlementPopup(true);
        setTriggerConfetti(true);
        
        // Add to shown popups
        setShownOTPpopups(prev => new Set(prev).add(latestCompleted.paymentId));
        
        // Hide confetti after 5 seconds
        setTimeout(() => {
          setTriggerConfetti(false);
        }, 5000);
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
        
        // Also manually check for new OTPs from Firestore
        if (retailer?.id && tenantId) {
          console.log('🔄 Manually checking for new OTPs from Firestore');
          try {
            const retailerRef = doc(db, 'retailers', retailer.id);
            const retailerDoc = await getDoc(retailerRef);
            
            if (retailerDoc.exists()) {
              const retailerData = retailerDoc.data();
              const activeOTPsFromFirestore = retailerData.activeOTPs || [];
              
              console.log('🔍 Manual OTP check found:', {
                activeOTPsFromFirestoreCount: activeOTPsFromFirestore.length,
                activeOTPsFromFirestore: activeOTPsFromFirestore.map((otp: any) => ({
                  paymentId: otp.paymentId,
                  code: otp.code,
                  amount: otp.amount,
                  expiresAt: otp.expiresAt.toDate(),
                  isUsed: otp.isUsed,
                  isExpired: otp.expiresAt.toDate() <= new Date()
                }))
              });
              
              // Check if there are new OTPs that aren't in our current activeOTPs state
              const currentPaymentIds = new Set(activeOTPs.map(otp => otp.paymentId));
              const newOTPsFromFirestore = activeOTPsFromFirestore.filter((otp: any) => {
                // Check if OTP is not expired and not already in our state
                const expiresAt = otp.expiresAt.toDate();
                const isExpired = expiresAt <= new Date();
                return !isExpired && !currentPaymentIds.has(otp.paymentId) && !otp.isUsed;
              });
              
              if (newOTPsFromFirestore.length > 0) {
                console.log('🆕 New OTPs found during manual refresh:', newOTPsFromFirestore.length);
                
                // Add new OTPs to our in-memory store for display
                newOTPsFromFirestore.forEach((otp: any) => {
                  addActiveOTP({
                    code: otp.code,
                    retailerId: retailer.id,
                    amount: otp.amount,
                    paymentId: otp.paymentId,
                    lineWorkerName: otp.lineWorkerName,
                    expiresAt: otp.expiresAt.toDate(),
                    createdAt: otp.createdAt.toDate()
                  });
                });
                
                // Refresh the active OTPs state
                const updatedActiveOTPs = getActiveOTPsForRetailer(retailer.id);
                setActiveOTPs(updatedActiveOTPs);
                
                // Show popup for the latest OTP
                const latestOTP = newOTPsFromFirestore[newOTPsFromFirestore.length - 1];
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
                      initiatedAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                      otpSentAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                    },
                    createdAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                    updatedAt: { toDate: () => latestOTP.createdAt.toDate() } as any,
                  });
                  setShowOTPPopup(true);
                  
                  // Add to shown popups
                  setShownOTPpopups(prev => new Set(prev).add(latestOTP.paymentId));
                }
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

  // Generate receipt content
  const generateReceiptContent = (payment: any) => {
    const wholesalerName = wholesalerNames[tenantId || ''] || 'Unknown Wholesaler';
    const lineWorkerName = lineWorkerNames[payment.lineWorkerId] || 'Unknown Line Worker';
    
    return `
PAYMENT RECEIPT

==============================
${wholesalerName}
==============================

Date: ${formatTimestampWithTime(payment.createdAt)}
Receipt ID: ${payment.id}

RETAILER INFORMATION
Name: ${retailer?.name || 'Unknown'}
${retailer?.phone ? `Phone: ${retailer.phone}` : ''}
${retailer?.address ? `Address: ${retailer.address}` : ''}

PAYMENT DETAILS
Amount: ${formatCurrency(payment.totalPaid)}
Payment Method: ${payment.method}
Status: ${payment.state}

COLLECTED BY
Line Worker: ${lineWorkerName}

==============================
Thank you for your payment!
==============================
    `.trim();
  };

  // Download receipt
  const downloadReceipt = (payment: any) => {
    const content = generateReceiptContent(payment);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share receipt
  const shareReceipt = async (payment: any) => {
    const content = generateReceiptContent(payment);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: content,
        });
      } catch (error) {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(content);
        alert('Receipt copied to clipboard!');
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(content);
      alert('Receipt copied to clipboard!');
    }
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
        title="Retailer Dashboard"
        subtitle="Manage your payments and view transaction history"
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={logout}
        notificationCount={notificationCount}
        notifications={notifications}
      />

      {/* Main Content Area */}
      <div className="pt-20 sm:pt-16 pb-20 lg:pb-0"> {/* Add padding for fixed header and bottom nav */}
        <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Retailer Dashboard</h1>
                <p className="text-gray-600">Manage your payments and view transaction history</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={mainLoadingState.loadingState.isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${mainLoadingState.loadingState.isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

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
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
                          <div className="bg-green-100 p-2 rounded-full">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</div>
                          <p className="text-xs text-gray-500">All time payments</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Today's Payments</CardTitle>
                          <div className="bg-blue-100 p-2 rounded-full">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(todayPaid)}</div>
                          <p className="text-xs text-gray-500">{todayPayments.length} transactions</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Active OTPs</CardTitle>
                          <div className="bg-orange-100 p-2 rounded-full">
                            <Bell className="h-4 w-4 text-orange-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{activeOTPs.length}</div>
                          <p className="text-xs text-gray-500">Pending verification</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-gray-600">Wholesaler</CardTitle>
                          <div className="bg-purple-100 p-2 rounded-full">
                            <Store className="h-4 w-4 text-purple-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">{wholesalerNames[tenantId || ''] || 'Loading...'}</div>
                          <p className="text-xs text-gray-500">Your wholesaler</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Active OTP Cards - Clickable to reopen popup */}
                    {activeOTPs.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-orange-600" />
                            Active OTP Requests
                            <Badge variant="secondary" className="ml-2">{activeOTPs.length}</Badge>
                          </CardTitle>
                          <CardDescription>
                            Click on any OTP card to view the verification details
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeOTPs.map((otp) => {
                              const timeLeft = otpCountdowns.get(otp.paymentId) || 0;
                              const isExpired = timeLeft <= 0;
                              
                              return (
                                <div 
                                  key={otp.paymentId}
                                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                    isExpired 
                                      ? 'border-gray-300 bg-gray-50' 
                                      : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                                  }`}
                                  onClick={() => {
                                    // Reopen the OTP popup for this specific OTP
                                    setNewPayment({
                                      ...otp,
                                      id: otp.paymentId,
                                      retailerId: retailer?.id || '',
                                      retailerName: retailer?.name || '',
                                      lineWorkerId: '',
                                      totalPaid: otp.amount,
                                      method: 'CASH' as any,
                                      state: 'OTP_SENT' as any,
                                      evidence: [],
                                      tenantId: tenantId || '',
                                      timeline: {
                                        initiatedAt: { toDate: () => otp.createdAt } as any,
                                        otpSentAt: { toDate: () => otp.createdAt } as any,
                                      },
                                      createdAt: { toDate: () => otp.createdAt } as any,
                                      updatedAt: { toDate: () => otp.createdAt } as any,
                                    });
                                    setShowOTPPopup(true);
                                  }}
                                >
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-gray-900">Amount</div>
                                        <div className="text-lg font-bold text-green-600">{formatCurrency(otp.amount)}</div>
                                      </div>
                                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                                        isExpired 
                                          ? 'bg-gray-200 text-gray-700' 
                                          : 'bg-orange-200 text-orange-800'
                                      }`}>
                                        {isExpired ? 'EXPIRED' : 'ACTIVE'}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <div className="text-sm text-gray-600">Line Worker</div>
                                      <div className="font-medium">{otp.lineWorkerName}</div>
                                    </div>
                                    
                                    <div>
                                      <div className="text-sm text-gray-600">Time Remaining</div>
                                      <div className={`font-mono text-sm ${
                                        timeLeft < 60 ? 'text-red-600' : 'text-orange-600'
                                      }`}>
                                        {isExpired ? 'Expired' : formatCountdown(timeLeft)}
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-gray-500">
                                      Click to view OTP details
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Retailer Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Store Information</CardTitle>
                        <CardDescription>Your retailer profile details</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Store Name</Label>
                            <p className="text-gray-900">{retailer.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Phone</Label>
                            <p className="text-gray-900">{retailer.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Email</Label>
                            <p className="text-gray-900">{retailer.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Address</Label>
                            <p className="text-gray-900">{retailer.address || 'Not provided'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

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
                                    onClick={() => {
                                      downloadReceipt(payment);
                                    }}
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
                  </div>
                )}

                {/* Payments View */}
                {activeNav === 'payments' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
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
                                    <Badge className={
                                      payment.state === 'COMPLETED' 
                                        ? 'bg-green-100 text-green-800' 
                                        : payment.state === 'OTP_SENT' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                    }>
                                      {payment.state}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{lineWorkerNames[payment.lineWorkerId] || 'Loading...'}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {payment.state === 'COMPLETED' && (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => downloadReceipt(payment)}
                                            className="h-7 px-2 text-xs"
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            Download
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => shareReceipt(payment)}
                                            className="h-7 px-2 text-xs"
                                          >
                                            <Share className="h-3 w-3 mr-1" />
                                            Share
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {filteredPayments.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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

                {/* History View */}
                {activeNav === 'history' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Complete Payment History</h2>
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
                            <TableHead>Status</TableHead>
                            <TableHead>Line Worker</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments
                            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
                            .map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                                <TableCell>{formatCurrency(payment.totalPaid)}</TableCell>
                                <TableCell>{payment.method}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    payment.state === 'COMPLETED' 
                                      ? 'bg-green-100 text-green-800' 
                                      : payment.state === 'OTP_SENT' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                  }>
                                    {payment.state}
                                  </Badge>
                                </TableCell>
                                <TableCell>{lineWorkerNames[payment.lineWorkerId] || 'Loading...'}</TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    {payment.state === 'COMPLETED' && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadReceipt(payment)}
                                          className="h-7 px-2 text-xs"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          Download
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => shareReceipt(payment)}
                                          className="h-7 px-2 text-xs"
                                        >
                                          <Share className="h-3 w-3 mr-1" />
                                          Share
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          {payments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                No payment history found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      {/* OTP Verification Popup */}
      <Dialog open={showOTPPopup} onOpenChange={setShowOTPPopup}>
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
      <Dialog open={showSettlementPopup} onOpenChange={setShowSettlementPopup}>
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
                onClick={() => setShowSettlementPopup(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}