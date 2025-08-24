'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useLineWorker } from '@/contexts/AuthContext';
import { 
  retailerService, 
  invoiceService, 
  paymentService,
  areaService,
  Timestamp
} from '@/services/firestore';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { Retailer, Invoice, Payment, Area, PaymentInvoiceAllocation } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { 
  Store, 
  DollarSign, 
  Phone, 
  MapPin, 
  Plus, 
  LogOut,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  IndianRupee,
  Smartphone,
  Shield,
  Eye,
  History,
  FileText,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Bell,
  RefreshCw
} from 'lucide-react';

// Utility functions for days outstanding calculation
const getDaysOutstanding = (invoice: Invoice): number => {
  const now = new Date();
  const dueDate = invoice.dueDate.toDate();
  const diffTime = now.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getDaysOutstandingDisplay = (invoice: Invoice): { text: string; color: string } => {
  const daysOutstanding = getDaysOutstanding(invoice);
  
  if (daysOutstanding > 30) {
    return { text: `${daysOutstanding} days`, color: 'text-red-600 font-medium' };
  } else if (daysOutstanding > 7) {
    return { text: `${daysOutstanding} days`, color: 'text-orange-600 font-medium' };
  } else if (daysOutstanding > 0) {
    return { text: `${daysOutstanding} days`, color: 'text-yellow-600 font-medium' };
  } else if (daysOutstanding === 0) {
    return { text: 'Due today', color: 'text-green-600 font-medium' };
  } else {
    const daysUntilDue = Math.abs(daysOutstanding);
    return { text: `${daysUntilDue} days`, color: 'text-green-600' };
  }
};

// Days Outstanding Display Component
const DaysOutstandingDisplay = ({ invoice }: { invoice: Invoice }) => {
  const display = getDaysOutstandingDisplay(invoice);
  
  return (
    <span className={display.color}>
      {display.text}
    </span>
  );
};

export function LineWorkerDashboard() {
  const { user, logout } = useAuth();
  const isLineWorker = useLineWorker();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [retailerPaymentHistory, setRetailerPaymentHistory] = useState<Payment[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    totalPaid: 0,
    method: 'CASH' as 'CASH' | 'UPI',
    invoiceAllocations: [] as PaymentInvoiceAllocation[],
    evidenceImage: null as File | null
  });
  const [otpCode, setOtpCode] = useState('');
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [previousAssignments, setPreviousAssignments] = useState<{
    areas: string[];
    zips: string[];
    retailers: string[];
  } | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [paymentTab, setPaymentTab] = useState('completed');
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState('today');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { startDate: startOfDay, endDate: endOfDay };
  });

  // Helper functions to filter data by date range
  const filterPaymentsByDateRange = (paymentsData: Payment[]) => {
    return paymentsData.filter(payment => {
      const paymentDate = payment.createdAt.toDate();
      return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    });
  };

  const filterInvoicesByDateRange = (invoicesData: Invoice[]) => {
    return invoicesData.filter(invoice => {
      const invoiceDate = invoice.issueDate.toDate();
      return invoiceDate >= dateRange.startDate && invoiceDate <= dateRange.endDate;
    });
  };

  const calculateOutstandingForDateRange = (invoicesData: Invoice[], paymentsData: Payment[]) => {
    const filteredInvoices = filterInvoicesByDateRange(invoicesData);
    const filteredPayments = filterPaymentsByDateRange(paymentsData).filter(p => p.state === 'COMPLETED');
    
    const totalInvoiceAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const totalPaid = filteredPayments.reduce((sum, payment) => sum + payment.totalPaid, 0);
    
    return Math.max(0, totalInvoiceAmount - totalPaid);
  };

  const handleDateRangeChange = (value: string, newDateRange: { startDate: Date; endDate: Date }) => {
    setSelectedDateRangeOption(value);
    setDateRange(newDateRange);
  };

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'retailer-details', label: 'Retailer Details', icon: Eye },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'History', icon: History },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  // Helper function to get the current tenant ID
  const getCurrentTenantId = (): string | null => {
    return user?.tenantId && user.tenantId !== 'system' ? user.tenantId : null;
  };

  useEffect(() => {
    const currentTenantId = getCurrentTenantId();
    if (isLineWorker && user?.uid && currentTenantId) {
      // Check if user has the required assigned data
      if (!user.assignedAreas || user.assignedAreas.length === 0) {
        setError('No areas assigned to your account. Please contact your administrator.');
        return;
      }
      fetchLineWorkerData();
      
      // Start real-time notifications
      realtimeNotificationService.startListening(
        user.uid,
        'LINE_WORKER',
        currentTenantId,
        (newNotifications) => {
          setNotifications(newNotifications);
          setNotificationCount(newNotifications.filter(n => !n.read).length);
        }
      );
    }

    // Cleanup on unmount
    return () => {
      if (user?.uid) {
        realtimeNotificationService.stopListening(user.uid);
      }
    };
  }, [isLineWorker, user]);

  // Resend OTP timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Notification service integration
  useEffect(() => {
    // Set up notification listener
    const handleNotificationsUpdate = (newNotifications: NotificationItem[]) => {
      setNotifications(newNotifications);
      setNotificationCount(newNotifications.filter(n => !n.read).length);
    };

    notificationService.addListener(handleNotificationsUpdate);
    
    // Initialize with current notifications
    const currentNotifications = notificationService.getNotifications();
    setNotifications(currentNotifications);
    setNotificationCount(notificationService.getUnreadCount());

    return () => {
      notificationService.removeListener(handleNotificationsUpdate);
    };
  }, []);

  // Check for milestones and generate notifications
  useEffect(() => {
    if (payments.length > 0 && retailers.length > 0) {
      checkForMilestones();
    }
  }, [payments, retailers]);

  const checkForMilestones = () => {
    const completedPayments = payments.filter(p => p.state === 'COMPLETED');
    const totalCollected = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
    
    // Check for payment milestones
    if (completedPayments.length === 10) {
      notificationService.addLineWorkerMilestone(
        'PAYMENTS',
        10,
        '🎉 Congratulations! You\'ve completed 10 payments!'
      );
    }
    
    if (completedPayments.length === 50) {
      notificationService.addLineWorkerMilestone(
        'PAYMENTS',
        50,
        '🎉 Amazing! You\'ve completed 50 payments!'
      );
    }
    
    // Check for amount milestones
    if (totalCollected >= 10000 && totalCollected < 11000) {
      notificationService.addLineWorkerMilestone(
        'AMOUNT',
        10000,
        '🎉 Fantastic! You\'ve collected ₹10,000+ in total!'
      );
    }
    
    if (totalCollected >= 50000 && totalCollected < 51000) {
      notificationService.addLineWorkerMilestone(
        'AMOUNT',
        50000,
        '🎉 Outstanding! You\'ve collected ₹50,000+ in total!'
      );
    }
    
    // Check for high-value collections (single payment > 5000)
    const recentHighValuePayments = completedPayments.filter(p => 
      p.totalPaid > 5000 && 
      new Date().getTime() - p.createdAt.toDate().getTime() < 24 * 60 * 60 * 1000
    );
    
    recentHighValuePayments.forEach(payment => {
      if (payment.retailerName) {
        notificationService.addLineWorkerHighValueCollection(
          payment.retailerName,
          payment.totalPaid,
          payment.id
        );
      } else {
        // Fallback to dynamic lookup for older payments without retailerName
        const retailer = retailers.find(r => r.id === payment.retailerId);
        if (retailer) {
          notificationService.addLineWorkerHighValueCollection(
            retailer.name,
            payment.totalPaid,
            payment.id
          );
        }
      }
    });
  };

  const fetchLineWorkerData = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;
    
    setError(null);
    
    try {
      console.log('Fetching line worker data for user:', user?.uid);
      console.log('User assigned areas:', user?.assignedAreas);
      console.log('User assigned zips:', user?.assignedZips);
      
      // Clean up any stuck payments first
      try {
        await paymentService.cleanupStuckPayments(currentTenantId);
        console.log('✅ Cleaned up stuck payments');
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up stuck payments:', cleanupError);
      }
      
      // Get all retailers first
      const allRetailers = await retailerService.getAll(currentTenantId);
      const allInvoices = await invoiceService.getAll(currentTenantId);
      const allAreas = await areaService.getAll(currentTenantId);
      const paymentsData = await paymentService.getPaymentsByLineWorker(currentTenantId, user!.uid);

      console.log('Total retailers found:', allRetailers.length);
      console.log('Total invoices found:', allInvoices.length);
      console.log('Payments found:', paymentsData.length);
      
      // Log each retailer's assignment details for debugging
      allRetailers.forEach(retailer => {
        console.log(`Retailer "${retailer.name}" - assignedLineWorkerId: ${retailer.assignedLineWorkerId}, areaId: ${retailer.areaId}`);
      });

      // Filter retailers by assigned areas OR direct assignments
      const assignedRetailers = allRetailers.filter(retailer => {
        // First check if retailer is directly assigned to this line worker
        if (retailer.assignedLineWorkerId === user?.uid) {
          console.log(`✅ Retailer "${retailer.name}" matched by direct assignment to line worker ${user!.uid}`);
          return true;
        }
        
        // If retailer is directly assigned to someone else, exclude it from area-based assignments
        if (retailer.assignedLineWorkerId && retailer.assignedLineWorkerId !== user?.uid) {
          console.log(`❌ Retailer "${retailer.name}" excluded - directly assigned to another line worker: ${retailer.assignedLineWorkerId}`);
          return false;
        }
        
        // If no areas assigned, can't see any area-based retailers
        if (!user?.assignedAreas || user.assignedAreas.length === 0) {
          console.log(`❌ Retailer "${retailer.name}" excluded - no assigned areas for user and no direct assignment`);
          return false;
        }
        
        // Check if retailer is in assigned areas (by areaId)
        if (retailer.areaId && user!.assignedAreas.includes(retailer.areaId)) {
          console.log(`✅ Retailer "${retailer.name}" matched by areaId: ${retailer.areaId}`);
          return true;
        }
        
        // Check if retailer has zipcodes that match assigned zips
        if (retailer.zipcodes && retailer.zipcodes.length > 0 && user!.assignedZips && user!.assignedZips.length > 0) {
          const matchingZips = retailer.zipcodes.filter(zip => user!.assignedZips!.includes(zip));
          if (matchingZips.length > 0) {
            console.log(`✅ Retailer "${retailer.name}" matched by zips: ${matchingZips.join(', ')}`);
            return true;
          }
        }
        
        console.log(`❌ Retailer "${retailer.name}" not matched - areaId: ${retailer.areaId}, zips: ${retailer.zipcodes?.join(', ') || 'none'}, directAssignment: ${retailer.assignedLineWorkerId}`);
        return false;
      });

      console.log('Assigned retailers after filtering:', assignedRetailers.length);

      // Filter invoices to only show those for assigned retailers
      const assignedInvoices = allInvoices.filter(invoice => 
        assignedRetailers.some(retailer => retailer.id === invoice.retailerId)
      );

      setRetailers(assignedRetailers);
      setInvoices(assignedInvoices);
      setPayments(paymentsData);
      setAreas(allAreas);
      
      // Calculate notification count
      const overdueRetailers = assignedRetailers.filter(r => r.currentOutstanding > 0).length;
      const pendingPayments = paymentsData.filter(p => p.state === 'INITIATED' || p.state === 'OTP_SENT').length;
      setNotificationCount(overdueRetailers + pendingPayments);
      
      // Recompute retailer data for accuracy (can be removed once all data is consistent)
      try {
        console.log('🔄 Recomputing retailer data for accuracy...');
        for (const retailer of assignedRetailers) {
          await retailerService.recomputeRetailerData(retailer.id, currentTenantId);
        }
        // Refresh retailers after recomputation
        const updatedRetailers = await retailerService.getAll(currentTenantId);
        const updatedAssignedRetailers = updatedRetailers.filter(retailer => {
          // First check if retailer is directly assigned to this line worker
          if (retailer.assignedLineWorkerId === user?.uid) {
            return true;
          }
          
          // If retailer is directly assigned to someone else, exclude it from area-based assignments
          if (retailer.assignedLineWorkerId && retailer.assignedLineWorkerId !== user?.uid) {
            return false;
          }
          
          // If no areas assigned, can't see any area-based retailers
          if (!user?.assignedAreas || user.assignedAreas.length === 0) {
            return false;
          }
          
          if (retailer.areaId && user!.assignedAreas.includes(retailer.areaId)) return true;
          if (retailer.zipcodes && retailer.zipcodes.length > 0 && user!.assignedZips && user!.assignedZips.length > 0) {
            const matchingZips = retailer.zipcodes.filter(zip => user!.assignedZips!.includes(zip));
            return matchingZips.length > 0;
          }
          return false;
        });
        setRetailers(updatedAssignedRetailers);
        console.log('✅ Retailer data recomputed and updated');
      } catch (error) {
        console.warn('Warning: Could not recompute retailer data:', error);
      }
      
      // Check for new assignments and send notifications
      checkForNewAssignments(assignedRetailers, allAreas);
      
      if (assignedRetailers.length === 0) {
        setError('No retailers assigned to your areas. Please contact your administrator.');
      }
    } catch (err: any) {
      console.error('Error fetching line worker data:', err);
      setError(err.message || 'Failed to fetch line worker data');
    }
  };

  const handleManualRefresh = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId) return;
    
    setRefreshLoading(true);
    try {
      await fetchLineWorkerData();
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setRefreshLoading(false);
    }
  };

  const checkForNewAssignments = (currentRetailers: Retailer[], currentAreas: Area[]) => {
    if (!user) return;
    
    const currentAreaIds = user!.assignedAreas || [];
    const currentZipIds = user!.assignedZips || [];
    const currentRetailerIds = currentRetailers.map(r => r.id);
    
    if (previousAssignments) {
      // Check for new areas
      const newAreaIds = currentAreaIds.filter(areaId => !previousAssignments.areas.includes(areaId));
      if (newAreaIds.length > 0) {
        newAreaIds.forEach(areaId => {
          const area = currentAreas.find(a => a.id === areaId);
          if (area) {
            const retailersInArea = currentRetailers.filter(r => r.areaId === areaId);
            notificationService.addLineWorkerNewAreaAssignment(
              area.name,
              area.zipcodes.length,
              retailersInArea.length
            );
          }
        });
      }
      
      // Check for new retailers
      const newRetailerIds = currentRetailerIds.filter(retailerId => !previousAssignments.retailers.includes(retailerId));
      if (newRetailerIds.length > 0) {
        newRetailerIds.forEach(retailerId => {
          const retailer = currentRetailers.find(r => r.id === retailerId);
          if (retailer) {
            const area = currentAreas.find(a => a.id === retailer.areaId);
            notificationService.addLineWorkerNewRetailerAssignment(
              retailer.name,
              area?.name || 'Unknown Area',
              newRetailerIds.length
            );
          }
        });
      }
    }
    
    // Update previous assignments
    setPreviousAssignments({
      areas: currentAreaIds,
      zips: currentZipIds,
      retailers: currentRetailerIds
    });
  };

  const initiatePayment = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    
    // Get payment history for this retailer
    const retailerPayments = payments.filter(p => p.retailerId === retailer.id);
    
    setPaymentForm({
      totalPaid: Math.min(retailer.currentOutstanding, retailer.currentOutstanding), // Default to full amount
      method: 'CASH',
      invoiceAllocations: [], // Not using invoice allocations anymore
      evidenceImage: null
    });
    
    setRetailerPaymentHistory(retailerPayments);
    setShowPaymentDialog(true);
  };

  const handleSendOtp = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId || !selectedRetailer) return;
    
    setOtpSending(true);
    try {
      // Create payment first
      const paymentId = await paymentService.initiatePayment(currentTenantId, {
        retailerId: selectedRetailer.id,
        retailerName: selectedRetailer.name,
        lineWorkerId: user!.uid,
        totalPaid: paymentForm.totalPaid,
        method: paymentForm.method,
        invoiceAllocations: [] // No invoice allocations needed
      });

      // Call actual OTP API
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: selectedRetailer.id,
          paymentId: paymentId,
          amount: paymentForm.totalPaid,
          lineWorkerName: user!.displayName || 'Line Worker' // Add line worker name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Update payment state to OTP_SENT in database
      if (user!.tenantId) {
        const timeline: any = {
          otpSentAt: Timestamp.now()
        };
        
        // Safely copy existing timeline properties
        if (currentPayment?.timeline?.initiatedAt) {
          timeline.initiatedAt = currentPayment.timeline.initiatedAt;
        }
        if (currentPayment?.timeline?.verifiedAt) {
          timeline.verifiedAt = currentPayment.timeline.verifiedAt;
        }
        if (currentPayment?.timeline?.completedAt) {
          timeline.completedAt = currentPayment.timeline.completedAt;
        }
        
        await paymentService.updatePaymentState(paymentId, user!.tenantId, 'OTP_SENT', {
          timeline
        });
      } else {
        console.error('User tenantId is undefined, cannot update payment state');
      }

      setOtpSent(true);
      setShowOtpSection(true);
      setOtpSending(false);
      setResendDisabled(true);
      setResendTimer(30); // Start 30-second timer
      
      // Send payment initiated notification
      notificationService.addLineWorkerPaymentInitiatedNotification(
        selectedRetailer.name,
        paymentForm.totalPaid,
        paymentId
      );
      
      // Set the current payment with updated state
      const updatedPayment: Payment = {
        id: paymentId,
        tenantId: user!.tenantId!,
        retailerId: selectedRetailer.id,
        retailerName: selectedRetailer.name,
        lineWorkerId: user!.uid,
        invoiceAllocations: [],
        totalPaid: paymentForm.totalPaid,
        method: paymentForm.method,
        state: 'OTP_SENT',
        evidence: [],
        timeline: {
          initiatedAt: Timestamp.now(),
          otpSentAt: Timestamp.now()
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      setCurrentPayment(updatedPayment);
      
      // Show success message
      console.log('✅ OTP sent successfully to retailer:', selectedRetailer.phone);
      
    } catch (err: any) {
      console.error('❌ Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP');
      setOtpSending(false);
    }
  };

  const handleResendOtp = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentPayment || !currentTenantId) return;
    
    setOtpSending(true);
    try {
      // Call actual OTP API
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: currentPayment.retailerId,
          paymentId: currentPayment.id,
          amount: currentPayment.totalPaid,
          lineWorkerName: user!.displayName || 'Line Worker' // Add line worker name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend OTP');
      }

      // Update payment state to OTP_SENT in database (update timeline)
      await paymentService.updatePaymentState(currentPayment.id, currentPayment.tenantId, 'OTP_SENT', {
        timeline: {
          ...currentPayment.timeline,
          otpSentAt: Timestamp.now()
        }
      });

      setOtpSending(false);
      setResendDisabled(true);
      setResendTimer(30); // Reset timer to 30 seconds
      
      // Update current payment timeline
      setCurrentPayment(prev => prev ? {
        ...prev,
        timeline: {
          ...prev.timeline,
          otpSentAt: Timestamp.now()
        }
      } : null);
      
      // Clear previous OTP code
      setOtpCode('');
      
      // Show success message
      console.log('✅ OTP resent successfully to retailer:', selectedRetailer?.phone);
      
    } catch (err: any) {
      console.error('❌ Error resending OTP:', err);
      setError(err.message || 'Failed to resend OTP');
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (paymentId?: string) => {
    const payment = paymentId ? viewingPayment : currentPayment;
    if (!payment || !otpCode) return;
    
    console.log('🔍 Starting OTP verification:', {
      paymentId: payment.id,
      otpCode: otpCode,
      retailerId: payment.retailerId,
      lineWorkerId: payment.lineWorkerId
    });
    
    try {
      // Call actual OTP verification API
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: payment.id,
          otp: otpCode
        })
      });

      console.log('🔍 OTP verification response status:', response.status);
      const result = await response.json();
      console.log('🔍 OTP verification response:', result);

      if (!response.ok || !result.success) {
        console.error('❌ OTP verification failed:', result);
        throw new Error(result.error || 'Failed to verify OTP');
      }

      console.log('✅ OTP verification API call successful');

      // OTP verified successfully, complete the payment
      console.log('🔍 Completing payment:', {
        paymentId: payment.id,
        retailerId: payment.retailerId,
        lineWorkerId: payment.lineWorkerId,
        amount: payment.totalPaid,
        method: payment.method
      });
      
      await paymentService.updatePaymentState(payment.id, payment.tenantId, 'COMPLETED', {
        timeline: {
          ...payment.timeline,
          completedAt: Timestamp.now()
        }
      });
      
      console.log('✅ Payment completed successfully in database');
      
      // Send line worker specific notification about the collection
      if (payment.retailerName) {
        console.log('🔍 Adding line worker payment completed notification:', {
          retailerName: payment.retailerName,
          amount: payment.totalPaid,
          paymentId: payment.id
        });
        
        notificationService.addLineWorkerPaymentCompletedNotification(
          payment.retailerName,
          payment.totalPaid,
          payment.id
        );
      } else {
        // Fallback to dynamic lookup for older payments without retailerName
        const retailer = retailers.find(r => r.id === payment.retailerId);
        if (retailer) {
          console.log('🔍 Adding line worker payment completed notification:', {
            retailerName: retailer.name,
            amount: payment.totalPaid,
            paymentId: payment.id
          });
          
          notificationService.addLineWorkerPaymentCompletedNotification(
            retailer.name,
            payment.totalPaid,
            payment.id
          );
        }
      }
      
      // Check for high-value collection
      if (payment.totalPaid > 5000) {
        if (payment.retailerName) {
          notificationService.addLineWorkerHighValueCollection(
            payment.retailerName,
            payment.totalPaid,
            payment.id
          );
        } else {
          // Fallback to dynamic lookup for older payments without retailerName
          const retailer = retailers.find(r => r.id === payment.retailerId);
          if (retailer) {
            notificationService.addLineWorkerHighValueCollection(
              retailer.name,
              payment.totalPaid,
              payment.id
            );
          }
        }
      }
      
      // Close appropriate dialog and reset states
      if (paymentId) {
        // Called from payment details dialog
        setShowPaymentDetails(false);
        setViewingPayment(null);
      } else {
        // Called from main payment dialog
        setShowPaymentDialog(false);
        setShowOtpSection(false);
        setOtpSent(false);
        setCurrentPayment(null);
      }
      
      setOtpCode('');
      setResendTimer(0);
      setResendDisabled(false);
      
      // Add a small delay to ensure database updates are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchLineWorkerData();
      setError(null);
    } catch (err: any) {
      console.error('❌ Error verifying OTP:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError(err.message || 'Failed to verify OTP');
    }
  };

  const handlePaymentDialogChange = (open: boolean) => {
    if (!open) {
      // Reset all timer and OTP states when dialog is closed
      setResendTimer(0);
      setResendDisabled(false);
      setShowOtpSection(false);
      setOtpSent(false);
      setOtpCode('');
      setCurrentPayment(null);
    }
    setShowPaymentDialog(open);
  };

  const handlePaymentSubmit = async () => {
    // This is now just for validation, actual payment happens in OTP flow
    if (!selectedRetailer) return;
    
    if (paymentForm.totalPaid <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    
    if (paymentForm.totalPaid > selectedRetailer.currentOutstanding) {
      setError('Payment amount cannot exceed outstanding amount');
      return;
    }
    
    // Proceed to OTP flow
    await handleSendOtp();
  };

  const getPaymentStatusColor = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'OTP_VERIFIED':
        return 'bg-blue-100 text-blue-800';
      case 'OTP_SENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'OTP_VERIFIED':
        return <Clock className="h-4 w-4" />;
      case 'OTP_SENT':
        return <AlertCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      case 'EXPIRED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Overview Component
  const Overview = () => {
    // Calculate filtered data for the selected date range
    const filteredPayments = filterPaymentsByDateRange(payments);
    const filteredInvoices = filterInvoicesByDateRange(invoices);
    const filteredCompletedPayments = filteredPayments.filter(p => p.state === 'COMPLETED');
    const filteredOutstandingAmount = calculateOutstandingForDateRange(invoices, payments);
    
    // Calculate filtered collections amount
    const filteredTotalCollections = filteredCompletedPayments.reduce((sum, p) => sum + p.totalPaid, 0);

    return (
      <div className="space-y-6">
        {/* Header with title and description */}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="text-gray-600">Your collection summary and performance</p>
        </div>

        {/* Date filter and refresh button row */}
        <div className="flex justify-center sm:justify-between items-center space-x-4">
          <DateRangeFilter value={selectedDateRangeOption} onValueChange={handleDateRangeChange} />
          <Button 
            onClick={handleManualRefresh} 
            disabled={refreshLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Retailers</CardTitle>
              <div className="bg-blue-100 p-2 rounded-full">
                <Store className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
              <p className="text-xs text-gray-500">In your assigned areas</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
              <div className="bg-green-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(filteredOutstandingAmount)}</div>
              <p className="text-xs text-gray-500">Outstanding amount (filtered)</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Collections</CardTitle>
              <div className="bg-purple-100 p-2 rounded-full">
                <IndianRupee className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{filteredCompletedPayments.length}</div>
              <p className="text-xs text-gray-500">Payments collected (filtered)</p>
              <div className="text-lg font-bold text-purple-600 mt-2">{formatCurrency(filteredTotalCollections)}</div>
              <p className="text-xs text-gray-500">Total amount collected (filtered)</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
              <div className="bg-orange-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
              <p className="text-xs text-gray-500">Invoices (filtered)</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your latest payment collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCompletedPayments
                .slice(0, 5)
                .map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{payment.retailerName || retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{formatTimestampWithTime(payment.createdAt)}</div>
                        <div className="text-sm text-purple-600 font-medium">Collected: {formatCurrency(payment.totalPaid)} by {user?.displayName || 'Line Worker'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">{formatCurrency(payment.totalPaid)}</div>
                      <div className="text-sm text-gray-500">{payment.method}</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Retailers Component
  const RetailersComponent = () => (
    <div className="space-y-6">
      {/* Header with title, description and refresh button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">Your Retailers</h2>
          <p className="text-gray-600">Retailers assigned to your areas</p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={refreshLoading}
          variant="outline"
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Retailers</CardTitle>
          <CardDescription>Manage and collect payments from your assigned retailers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {retailers.map((retailer) => (
              <div key={retailer.id} className="border rounded-lg p-4">
                {/* Mobile Layout */}
                <div className="sm:hidden space-y-4">
                  {/* Retailer Info */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{retailer.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {retailer.phone}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        <span className="truncate block">{retailer.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info and Action */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <div className="font-medium text-gray-900">{formatCurrency(retailer.currentOutstanding)}</div>
                      <div className="text-sm text-gray-500">Outstanding</div>
                    </div>
                    <Button
                      onClick={() => initiatePayment(retailer)}
                      disabled={retailer.currentOutstanding <= 0}
                      size="sm"
                    >
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Collect
                    </Button>
                  </div>
                </div>

                {/* Desktop Layout - Original */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Store className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{retailer.name}</div>
                      <div className="text-sm text-gray-500">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {retailer.phone}
                      </div>
                      <div className="text-sm text-gray-500">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {retailer.address}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(retailer.currentOutstanding)}</div>
                      <div className="text-sm text-gray-500">Outstanding</div>
                    </div>
                    <Button
                      onClick={() => initiatePayment(retailer)}
                      disabled={retailer.currentOutstanding <= 0}
                    >
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Collect Payment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Payments Component
  const PaymentsComponent = () => {
    // Filter payments based on status and sort by most recent first
    const completedPayments = payments
      .filter(payment => payment.state === 'COMPLETED')
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    
    const pendingCancelledPayments = payments
      .filter(payment => 
        ['INITIATED', 'OTP_SENT', 'OTP_VERIFIED', 'CANCELLED', 'EXPIRED'].includes(payment.state)
      )
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
            <p className="text-gray-600">All your payment collections</p>
          </div>
          <Button 
            onClick={handleManualRefresh} 
            disabled={refreshLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>Your payment collection history</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={paymentTab} onValueChange={setPaymentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completed" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed ({completedPayments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending/Cancelled ({pendingCancelledPayments.length})</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="completed" className="space-y-4">
                {completedPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Retailer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                            <TableCell>{payment.retailerName || retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.method}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPaymentStatusColor(payment.state)}>
                                <div className="flex items-center space-x-1">
                                  {getPaymentStatusIcon(payment.state)}
                                  <span>{payment.state}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => {
                                setViewingPayment(payment);
                                setShowPaymentDetails(true);
                              }}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No completed payments</h3>
                    <p className="text-gray-500">You don't have any completed payments yet.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="pending" className="space-y-4">
                {pendingCancelledPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Retailer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingCancelledPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                            <TableCell>{payment.retailerName || retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.method}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPaymentStatusColor(payment.state)}>
                                <div className="flex items-center space-x-1">
                                  {getPaymentStatusIcon(payment.state)}
                                  <span>{payment.state}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => {
                                setViewingPayment(payment);
                                setShowPaymentDetails(true);
                              }}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending or cancelled payments</h3>
                    <p className="text-gray-500">You don't have any pending or cancelled payments.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  // History Component
  const HistoryComponent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity History</h2>
          <p className="text-gray-600">Your recent activities and achievements</p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={refreshLoading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Your latest payment collections and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments
              .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
              .slice(0, 10)
              .map((payment) => (
                <div key={payment.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {payment.state === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {payment.state === 'OTP_SENT' && <Clock className="h-5 w-5 text-yellow-600" />}
                    {payment.state === 'CANCELLED' && <XCircle className="h-5 w-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {payment.state === 'COMPLETED' ? 'Payment Collected' : 
                       payment.state === 'OTP_SENT' ? 'Payment Initiated' : 
                       'Payment Cancelled'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.retailerName || retailers.find(r => r.id === payment.retailerId)?.name || 'Unknown'} • 
                      {formatTimestampWithTime(payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(payment.totalPaid)}</div>
                    <div className="text-sm text-gray-500">{payment.method}</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Retailer Details Component - Complete detailed logs of assigned retailers
  const RetailerDetails = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">Retailer Details & Logs</h2>
          <p className="text-gray-600">Complete detailed logs of your assigned retailers including invoices and payments</p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={refreshLoading}
          variant="outline"
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          {refreshLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Retailers</CardTitle>
            <Store className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{retailers.length}</div>
            <p className="text-xs text-gray-500">
              {retailers.filter(r => r.currentOutstanding > 0).length} with outstanding balance
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
            <p className="text-xs text-gray-500">
              {invoices.filter(i => i.status === 'PAID').length} paid
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">My Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
            <p className="text-xs text-gray-500">
              {payments.filter(p => p.state === 'COMPLETED').length} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(retailers.reduce((sum, r) => sum + r.currentOutstanding, 0))}
            </div>
            <p className="text-xs text-gray-500">
              Across your retailers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retailers with Detailed Logs */}
      <div className="space-y-6">
        {retailers.map(retailer => {
          const retailerInvoices = invoices.filter(inv => inv.retailerId === retailer.id);
          const retailerPayments = payments.filter(pay => pay.retailerId === retailer.id);
          
          // Calculate performance metrics for this retailer
          const totalBilled = retailerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
          const totalPaid = retailerPayments.filter(p => p.state === 'COMPLETED').reduce((sum, pay) => sum + pay.totalPaid, 0);
          const paymentSuccessRate = retailerPayments.length > 0 
            ? (retailerPayments.filter(p => p.state === 'COMPLETED').length / retailerPayments.length) * 100 
            : 0;

          return (
            <Card key={retailer.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{retailer.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span>📞 {retailer.phone}</span>
                        <span>📍 {retailer.address}</span>
                        <span>🏷️ {retailer.zipcodes.join(', ')}</span>
                        <span>📊 Success Rate: {paymentSuccessRate.toFixed(1)}%</span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(retailer.currentOutstanding)}
                    </div>
                    <div className="text-sm text-gray-500">Outstanding</div>
                    <Button
                      onClick={() => initiatePayment(retailer)}
                      disabled={retailer.currentOutstanding <= 0}
                      size="sm"
                      className="mt-2"
                    >
                      <IndianRupee className="h-4 w-4 mr-1" />
                      Collect
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{retailerInvoices.length}</div>
                    <div className="text-sm text-gray-600">Total Invoices</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{retailerPayments.length}</div>
                    <div className="text-sm text-gray-600">Payment Attempts</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(totalBilled)}
                    </div>
                    <div className="text-sm text-gray-600">Total Billed</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalPaid)}
                    </div>
                    <div className="text-sm text-gray-600">Total Collected</div>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Collection Rate</div>
                        <div className="text-lg font-bold text-green-700">
                          {totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Last Payment</div>
                        <div className="text-lg font-bold text-blue-700">
                          {retailerPayments.length > 0 
                            ? formatTimestamp(retailerPayments[retailerPayments.length - 1].createdAt)
                            : 'Never'
                          }
                        </div>
                      </div>
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Avg Payment</div>
                        <div className="text-lg font-bold text-purple-700">
                          {retailerPayments.filter(p => p.state === 'COMPLETED').length > 0
                            ? formatCurrency(totalPaid / retailerPayments.filter(p => p.state === 'COMPLETED').length)
                            : '₹0'
                          }
                        </div>
                      </div>
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Tabs for Invoices and Payments */}
                <Tabs defaultValue="invoices" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="invoices">Invoices ({retailerInvoices.length})</TabsTrigger>
                    <TabsTrigger value="payments">Payments ({retailerPayments.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="invoices" className="space-y-4">
                    {retailerInvoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Days Outstanding</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {retailerInvoices.map(invoice => (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                <TableCell>{formatTimestamp(invoice.issueDate)}</TableCell>
                                <TableCell>{formatTimestamp(invoice.dueDate)}</TableCell>
                                <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                                <TableCell>
                                  <DaysOutstandingDisplay invoice={invoice} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No invoices found for this retailer
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="payments" className="space-y-4">
                    {retailerPayments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {retailerPayments.map(payment => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                                <TableCell>{formatCurrency(payment.totalPaid)}</TableCell>
                                <TableCell>{payment.method}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    payment.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    payment.state === 'OTP_SENT' ? 'bg-yellow-100 text-yellow-800' :
                                    payment.state === 'CANCELLED' || payment.state === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                    payment.state === 'OTP_VERIFIED' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {payment.state}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setViewingPayment(payment);
                                    setShowPaymentDetails(true);
                                  }}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No payments found for this retailer
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  if (!isLineWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this dashboard.</p>
        </div>
      </div>
    );
  }

  // Main component return - no global loading state

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <DashboardNavigation
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        navItems={navItems}
        title="PharmaLync"
        subtitle="Line Worker Dashboard"
        notificationCount={notificationCount}
        notifications={notifications}
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
        {error && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Content based on active navigation */}
        <div className="space-y-4 sm:space-y-6">
          {activeNav === 'overview' && <Overview />}
          {activeNav === 'retailers' && <RetailersComponent />}
          {activeNav === 'retailer-details' && <RetailerDetails />}
          {activeNav === 'payments' && <PaymentsComponent />}
          {activeNav === 'history' && <HistoryComponent />}
        </div>
      </main>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={handlePaymentDialogChange}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Collect Payment</DialogTitle>
            <DialogDescription className="text-sm">
              Collect payment from {selectedRetailer?.name}
            </DialogDescription>
          </DialogHeader>
          
          {!showOtpSection ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Retailer</Label>
                  <div className="font-medium text-sm sm:text-base">{selectedRetailer?.name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Outstanding Amount</Label>
                  <div className="font-medium text-sm sm:text-base">{formatCurrency(selectedRetailer?.currentOutstanding || 0)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium" htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    value={paymentForm.totalPaid}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, totalPaid: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    max={selectedRetailer?.currentOutstanding}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select 
                    value={paymentForm.method} 
                    onValueChange={(value: 'CASH' | 'UPI') => setPaymentForm(prev => ({ ...prev, method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment History */}
              {retailerPaymentHistory.length > 0 && (
                <div className="space-y-2">
                  <Label>Recent Payments</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {retailerPaymentHistory.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                        <span>{formatTimestamp(payment.createdAt)}</span>
                        <span className="font-medium">{formatCurrency(payment.totalPaid)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={handlePaymentSubmit} disabled={otpSending}>
                  {otpSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-semibold mb-2">OTP Verification</h3>
                <p className="text-gray-600 mb-4">
                  An OTP has been sent to {selectedRetailer?.phone}. Please enter the OTP to verify the payment.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <Button onClick={() => handleVerifyOtp()} disabled={otpCode.length !== 6}>
                  Verify OTP
                </Button>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Didn't receive OTP?</span>
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    disabled={resendDisabled || otpSending}
                    className="p-0 h-auto"
                  >
                    {otpSending ? (
                      'Sending...'
                    ) : resendDisabled ? (
                      `Resend in ${resendTimer}s`
                    ) : (
                      'Resend OTP'
                    )}
                  </Button>
                </div>
              </div>

              {currentPayment && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Payment Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Amount:</div>
                    <div className="font-medium">{formatCurrency(currentPayment.totalPaid)}</div>
                    <div>Method:</div>
                    <div className="font-medium">{currentPayment.method}</div>
                    <div>Status:</div>
                    <div className="font-medium">{currentPayment.state}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              View detailed information about this payment
            </DialogDescription>
          </DialogHeader>
          
          {viewingPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment ID</Label>
                  <div className="font-medium">{viewingPayment.id}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="font-medium">{formatCurrency(viewingPayment.totalPaid)}</div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <div className="font-medium">{viewingPayment.method}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="font-medium">
                    <Badge variant={viewingPayment.state === 'COMPLETED' ? 'default' : 'secondary'}>
                      {viewingPayment.state}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Created At</Label>
                  <div className="font-medium">{formatTimestampWithTime(viewingPayment.createdAt)}</div>
                </div>
                <div>
                  <Label>Retailer ID</Label>
                  <div className="font-medium">{viewingPayment.retailerId}</div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-2">Payment Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Initiated:</span>
                    <span>{formatTimestampWithTime(viewingPayment.timeline.initiatedAt)}</span>
                  </div>
                  {viewingPayment.timeline.otpSentAt && (
                    <div className="flex justify-between">
                      <span>OTP Sent:</span>
                      <span>{formatTimestampWithTime(viewingPayment.timeline.otpSentAt)}</span>
                    </div>
                  )}
                  {viewingPayment.timeline.verifiedAt && (
                    <div className="flex justify-between">
                      <span>Verified:</span>
                      <span>{formatTimestampWithTime(viewingPayment.timeline.verifiedAt)}</span>
                    </div>
                  )}
                  {viewingPayment.timeline.completedAt && (
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span>{formatTimestampWithTime(viewingPayment.timeline.completedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Section for pending payments */}
              {viewingPayment.state === 'OTP_SENT' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-lg font-semibold mb-2">OTP Verification</h3>
                    <p className="text-gray-600 mb-4">
                      Enter the OTP sent to the retailer to complete this payment.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setShowPaymentDetails(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleVerifyOtp(viewingPayment.id)}>
                      Verify OTP
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}