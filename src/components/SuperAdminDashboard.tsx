'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { SuccessFeedback } from '@/components/SuccessFeedback';
import { useSuccessFeedback } from '@/hooks/useSuccessFeedback';

import { Skeleton } from '@/components/ui/skeleton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { LoadingText } from '@/components/ui/LoadingText';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useAuth, useSuperAdmin } from '@/contexts/AuthContext';
import { 
  tenantService, 
  userService, 
  areaService, 
  retailerService, 
  paymentService,
  Timestamp
} from '@/services/firestore';
import { TENANT_STATUSES } from '@/lib/firebase';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';
import { Tenant, CreateTenantForm, User, Area, Retailer, Payment } from '@/types';
import { formatTimestamp, formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { 
  Building2, 
  Users, 
  FileText, 
  DollarSign, 
  Plus, 
  Settings, 
  LogOut,
  TrendingUp,
  AlertCircle,
  Eye,
  UserCheck,
  UserX,
  MapPin,
  Store,
  CreditCard,
  Calendar,
  Search,
  Filter,
  Download,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Bell,
  Menu,
  X,
  RefreshCw,
  Loader2,
  Heart
} from 'lucide-react';
import { StatusBarColor } from './ui/StatusBarColor';

interface TenantDetails {
  tenant: Tenant;
  users: User[];
  areas: Area[];
  retailers: Retailer[];
  payments: Payment[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalAreas: number;
    activeAreas: number;
    totalRetailers: number;
    activeRetailers: number;
    totalPayments: number;
    totalRevenue: number;
  };
}

interface AnalyticsData {
  totalRevenue: number;
  totalTenants: number;
  totalUsers: number;
  totalRetailers: number;
  totalPayments: number;
  activeTenants: number;
  suspendedTenants: number;
  avgRevenuePerUser: number;
  avgRevenuePerRetailer: number;
  paymentSuccessRate: number;
  avgCollectionPerUser: number;
  tenantAnalytics: Array<{
    tenantId: string;
    tenantName: string;
    revenue: number;
    users: number;
    retailers: number;
    payments: number;
    activeUsers: number;
    activeRetailers: number;
    avgRevenuePerUser: number;
    avgCollectionPerUser: number;
  }>;
}

export function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const isSuperAdmin = useSuperAdmin();
  const { showSuccess, hideSuccess, feedback } = useSuccessFeedback();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDetails, setTenantDetails] = useState<TenantDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedTenantForAnalytics, setSelectedTenantForAnalytics] = useState<string>('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState('today');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { startDate: startOfDay, endDate: endOfDay };
  });

  // Standardized loading state management
  const mainLoadingState = useLoadingState();
  const tenantDetailsLoadingState = useLoadingState();
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

  const refreshData = async () => {
    mainLoadingState.setRefreshing(true);
    try {
      await Promise.all([fetchTenants(), fetchAnalytics(), fetchRecentActivities()]);
      setLastUpdate(new Date());
    } finally {
      mainLoadingState.setRefreshing(false);
    }
  };

  const generateNotifications = (tenantsData: any[], tenantAnalytics: any[], activities: any[] = []) => {
    const newNotifications: NotificationItem[] = [];
    
    // Add real activity notifications first
    activities.forEach(activity => {
      newNotifications.push({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        message: activity.message,
        timestamp: activity.timestamp,
        read: false
      });
    });

    // Add notifications for suspended tenants
    const suspendedTenants = tenantsData.filter(t => t.status === 'SUSPENDED');
    suspendedTenants.forEach(tenant => {
      newNotifications.push({
        id: `suspended-${tenant.id}`,
        type: 'warning',
        title: 'Tenant Suspended',
        message: `${tenant.name} has been suspended due to inactivity`,
        timestamp: new Date(),
        read: false
      });
    });

    // Add notifications for low collection performance
    const lowCollectionTenants = tenantAnalytics.filter(t => t.avgCollectionPerUser < 1);
    lowCollectionTenants.forEach(tenant => {
      newNotifications.push({
        id: `collection-${tenant.tenantId}`,
        type: 'info',
        title: 'Low Collection Performance',
        message: `${tenant.tenantName} has ${tenant.avgCollectionPerUser.toFixed(1)} avg collections per user`,
        timestamp: new Date(),
        read: false
      });
    });

    // Add success notifications for active tenants
    const activeTenants = tenantsData.filter(t => t.status === 'ACTIVE');
    if (activeTenants.length > 0) {
      newNotifications.push({
        id: 'active-tenants',
        type: 'success',
        title: 'System Status',
        message: `${activeTenants.length} tenants are actively operating`,
        timestamp: new Date(),
        read: false
      });
    }

    return newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const fetchRecentActivities = async () => {
    try {
      const tenantsData = await tenantService.getAllTenants();
      const activities: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: Date;
      tenant: string;
      count?: number;
      amount?: number;
      icon?: React.ComponentType<{ className?: string }>;
    }> = [];

      for (const tenant of tenantsData) {
        try {
          const [users, retailers, payments] = await Promise.all([
            userService.getAll(tenant.id),
            retailerService.getAll(tenant.id),
            paymentService.getAll(tenant.id)
          ]);

          // Get recent users (last 7 days)
          const recentUsers = users.filter(u => {
            const userDate = u.createdAt ? u.createdAt.toDate() : new Date();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return userDate > weekAgo;
          });

          // Get recent retailers (last 7 days)
          const recentRetailers = retailers.filter(r => {
            const retailerDate = r.createdAt ? r.createdAt.toDate() : new Date();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return retailerDate > weekAgo;
          });

          // Get recent payments (last 7 days)
          const recentPayments = payments.filter(p => {
            const paymentDate = p.createdAt ? p.createdAt.toDate() : new Date();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return paymentDate > weekAgo && p.state === 'COMPLETED';
          });

          // Count line workers
          const lineWorkers = users.filter(u => u.roles?.includes('LINE_WORKER'));

          // Add activities for this tenant
          if (recentRetailers.length > 0) {
            activities.push({
              id: `retailers-${tenant.id}-${Date.now()}`,
              type: 'info',
              title: 'New Retailers Added',
              message: `${tenant.name} added ${recentRetailers.length} new retailer${recentRetailers.length > 1 ? 's' : ''}`,
              timestamp: new Date(),
              tenant: tenant.name,
              count: recentRetailers.length,
              icon: Store
            });
          }

          if (recentUsers.length > 0) {
            const newLineWorkers = recentUsers.filter(u => u.roles?.includes('LINE_WORKER'));
            if (newLineWorkers.length > 0) {
              activities.push({
                id: `workers-${tenant.id}-${Date.now()}`,
                type: 'success',
                title: 'New Line Workers',
                message: `${tenant.name} added ${newLineWorkers.length} new line worker${newLineWorkers.length > 1 ? 's' : ''}`,
                timestamp: new Date(),
                tenant: tenant.name,
                count: newLineWorkers.length,
                icon: UserCheck
              });
            }
          }

          if (recentPayments.length > 0) {
            const totalAmount = recentPayments.reduce((sum, p) => sum + p.totalPaid, 0);
            activities.push({
              id: `payments-${tenant.id}-${Date.now()}`,
              type: 'success',
              title: 'Payments Processed',
              message: `${tenant.name} processed ${recentPayments.length} payment${recentPayments.length > 1 ? 's' : ''} totaling ${formatCurrency(totalAmount)}`,
              timestamp: new Date(),
              tenant: tenant.name,
              count: recentPayments.length,
              amount: totalAmount,
              icon: CreditCard
            });
          }

        } catch (error) {
          console.error(`Failed to fetch activities for tenant ${tenant.id}:`, error);
        }
      }

      const sortedActivities = activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
      setRecentActivities(sortedActivities);
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false); // All data loaded
      return sortedActivities;
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      setRecentActivities([]);
      setDataFetchProgress(100);
      mainLoadingState.setLoading(false); // Still mark as loaded even if there's an error
      return [];
    }
  };

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'line-workers', label: 'Line Workers', icon: UserCheck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Menu },
  ];

  const [activeNav, setActiveNav] = useState('overview');

  // Memoized notification callback to prevent unnecessary re-renders
  const handleNotificationUpdate = useCallback((newNotifications: NotificationItem[]) => {
    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.read).length);
  }, []);

  useEffect(() => {
    if (isSuperAdmin && user) {
      // Reset loading state
      mainLoadingState.setLoading(true);
      setDataFetchProgress(0);
      
      // Start fetching data
      fetchTenants();
      fetchAnalytics();
      fetchRecentActivities();
      
      // Start real-time notifications - only once per session
      const notificationKey = `notifications_${user.uid}`;
      if (!sessionStorage.getItem(notificationKey)) {
        realtimeNotificationService.startListening(
          user.uid,
          'SUPER_ADMIN',
          'system', // Super admin listens to all tenants
          handleNotificationUpdate
        );
        sessionStorage.setItem(notificationKey, 'true');
      }
    }

    // Cleanup on unmount
    return () => {
      if (user) {
        realtimeNotificationService.stopListening(user.uid);
        sessionStorage.removeItem(`notifications_${user.uid}`);
      }
    };
  }, [isSuperAdmin, user]); // Only restart when user changes or role changes

  // Separate effect for data fetching when activeNav changes
  useEffect(() => {
    if (isSuperAdmin && user) {
      fetchTenants();
      fetchAnalytics();
      fetchRecentActivities();
    }
  }, [activeNav]); // Only fetch data, don't restart notifications

  const fetchTenants = async () => {
    setError(null);
    setDataFetchProgress(20);
    
    try {
      const tenantsData = await tenantService.getAllTenants();
      setTenants(tenantsData);
      setLastUpdate(new Date());
      setDataFetchProgress(40);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tenants');
    }
  };

  const fetchAnalytics = async () => {
    setDataFetchProgress(60);
    try {
      const tenantsData = await tenantService.getAllTenants();
      let totalRevenue = 0;
      let totalUsers = 0;
      let totalRetailers = 0;
      let totalPayments = 0;
      
      const tenantAnalytics: Array<{
        tenantId: string;
        tenantName: string;
        revenue: number;
        users: number;
        retailers: number;
        payments: number;
        activeUsers: number;
        activeRetailers: number;
        avgRevenuePerUser: number;
        avgCollectionPerUser: number;
      }> = [];

      for (const tenant of tenantsData) {
        try {
          const [users, retailers, payments] = await Promise.all([
            userService.getAll(tenant.id),
            retailerService.getAll(tenant.id),
            paymentService.getAll(tenant.id)
          ]);

          const tenantRevenue = payments
            .filter(p => p.state === 'COMPLETED')
            .reduce((sum, p) => sum + p.totalPaid, 0);

          totalRevenue += tenantRevenue;
          totalUsers += users.length;
          totalRetailers += retailers.length;
          totalPayments += payments.filter(p => p.state === 'COMPLETED').length;

          tenantAnalytics.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            revenue: tenantRevenue,
            users: users.length,
            retailers: retailers.length,
            payments: payments.filter(p => p.state === 'COMPLETED').length,
            activeUsers: users.filter(u => u.active).length,
            activeRetailers: retailers.length, // All retailers are considered active
            avgRevenuePerUser: users.length > 0 ? tenantRevenue / users.length : 0,
            avgCollectionPerUser: users.length > 0 ? payments.filter(p => p.state === 'COMPLETED').length / users.length : 0
          });
        } catch (error) {
          console.error(`Failed to fetch analytics for tenant ${tenant.id}:`, error);
        }
      }

      setAnalytics({
        totalRevenue,
        totalTenants: tenantsData.length,
        totalUsers,
        totalRetailers,
        totalPayments,
        activeTenants: tenantsData.filter(t => t.status === 'ACTIVE').length,
        suspendedTenants: tenantsData.filter(t => t.status === 'SUSPENDED').length,
        avgRevenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0,
        avgRevenuePerRetailer: totalRetailers > 0 ? totalRevenue / totalRetailers : 0,
        paymentSuccessRate: totalUsers > 0 ? (totalPayments / totalUsers) * 100 : 0,
        avgCollectionPerUser: totalUsers > 0 ? totalPayments / totalUsers : 0,
        tenantAnalytics
      });
      setDataFetchProgress(80);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchTenantDetails = async (tenantId: string) => {
    tenantDetailsLoadingState.setLoading(true);
    try {
      const [tenant, users, areas, retailers, payments] = await Promise.all([
        tenantService.getById(tenantId, 'system'),
        userService.getAll(tenantId),
        areaService.getAll(tenantId),
        retailerService.getAll(tenantId),
        paymentService.getAll(tenantId)
      ]);

      if (!tenant) return;

      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.active).length,
        totalAreas: areas.length,
        activeAreas: areas.filter(a => a.active).length,
        totalRetailers: retailers.length,
        activeRetailers: retailers.length,
        totalPayments: payments.filter(p => p.state === 'COMPLETED').length,
        totalRevenue: payments.filter(p => p.state === 'COMPLETED').reduce((sum, p) => sum + p.totalPaid, 0)
      };

      setTenantDetails({
        tenant,
        users,
        areas,
        retailers,
        payments,
        stats
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tenant details');
    } finally {
      tenantDetailsLoadingState.setLoading(false);
    }
  };

  const handleCreateTenant = async (data: CreateTenantForm) => {
    try {
      const tenantId = await tenantService.createTenant({
        name: data.name,
        plan: data.plan,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        adminPhone: data.adminPhone,
        adminName: data.adminName
      });
      
      await userService.createUserWithAuth(tenantId, {
        email: data.adminEmail,
        password: data.adminPassword,
        displayName: data.adminName,
        phone: data.adminPhone,
        roles: ['WHOLESALER_ADMIN']
      });
      
      await fetchTenants();
      await fetchAnalytics();
      setShowCreateTenant(false);
      showSuccess(`Tenant "${data.name}" created successfully with admin user ${data.adminName}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant and admin user');
    }
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: keyof typeof TENANT_STATUSES) => {
    try {
      const newStatus: keyof typeof TENANT_STATUSES = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await tenantService.update(tenantId, { status: newStatus }, 'system');
      
      if (newStatus === 'SUSPENDED') {
        const users = await userService.getAll(tenantId);
        await Promise.all(
          users.map(user => 
            userService.update(user.id, { active: false }, tenantId)
          )
        );
      } else {
        const users = await userService.getAll(tenantId);
        await Promise.all(
          users.map(user => 
            userService.update(user.id, { active: true }, tenantId)
          )
        );
      }
      
      await fetchTenants();
      await fetchAnalytics();
      if (selectedTenant?.id === tenantId) {
        await fetchTenantDetails(tenantId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant status');
    }
  };

  const handleToggleUserStatus = async (userId: string, tenantId: string, currentActive: boolean) => {
    try {
      await userService.update(userId, { active: !currentActive }, tenantId);
      if (selectedTenant) {
        await fetchTenantDetails(selectedTenant.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'WHOLESALER_ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'LINE_WORKER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Memoized filtered tenants to prevent unnecessary re-computations
  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      const matchesStatus = statusFilter === 'ALL' || tenant.status === statusFilter;
      return matchesStatus;
    });
  }, [tenants, statusFilter]);

  // Overview Component
  const Overview = () => (
    <div className="space-y-6">
      {analytics && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                <div className="bg-blue-100 p-2 rounded-full">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</div>
                <p className="text-xs text-gray-500">Across all tenants</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Tenants</CardTitle>
                <div className="bg-green-100 p-2 rounded-full">
                  <Building2 className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.activeTenants}
                </div>
                <p className="text-xs text-gray-500">of {analytics.totalTenants} total</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <div className="bg-purple-100 p-2 rounded-full">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</div>
                <p className="text-xs text-gray-500">Across all tenants</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-teal-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
                <div className="bg-teal-100 p-2 rounded-full">
                  <CreditCard className="h-4 w-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{analytics.totalPayments}</div>
                <p className="text-xs text-gray-500">Completed payments</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Collections/User</CardTitle>
                <div className="bg-indigo-100 p-2 rounded-full">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{analytics.avgCollectionPerUser.toFixed(1)}</div>
                <p className="text-xs text-gray-500">Average collections per user</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Tenants */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Tenants</CardTitle>
              <CardDescription>Revenue and collection performance by tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.tenantAnalytics
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((tenant, index) => (
                    <div key={tenant.tenantId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{tenant.tenantName}</div>
                          <div className="text-sm text-gray-500">{tenant.users} users, {tenant.retailers} retailers</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">{formatCurrency(tenant.revenue)}</div>
                        <div className="text-sm text-gray-500">{tenant.avgCollectionPerUser.toFixed(1)} avg/user</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setActiveNav('tenants')} 
                  className="flex items-center space-x-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Manage Tenants</span>
                </Button>
                <Button 
                  onClick={() => setActiveNav('users')} 
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Manage Users</span>
                </Button>
                <Button 
                  onClick={() => setActiveNav('analytics')} 
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  // Tenants Management Component
  const TenantsManagement = () => (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tenant Management</h2>
          <p className="text-gray-600">Manage all tenants and their settings</p>
        </div>
        <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Set up a new tenant with admin user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Tenant Name</Label>
                <Input id="tenantName" placeholder="Enter tenant name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input id="adminEmail" type="email" placeholder="admin@tenant.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password</Label>
                <Input id="adminPassword" type="password" placeholder="Enter password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input id="adminName" placeholder="Admin Display Name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPhone">Admin Phone</Label>
                <Input id="adminPhone" type="tel" placeholder="+1234567890" />
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => {
                  const name = (document.getElementById('tenantName') as HTMLInputElement)?.value;
                  const email = (document.getElementById('adminEmail') as HTMLInputElement)?.value;
                  const password = (document.getElementById('adminPassword') as HTMLInputElement)?.value;
                  const adminName = (document.getElementById('adminName') as HTMLInputElement)?.value;
                  const phone = (document.getElementById('adminPhone') as HTMLInputElement)?.value;
                  
                  if (name && email && password && adminName) {
                    handleCreateTenant({
                      name,
                      adminEmail: email,
                      adminPassword: password,
                      adminName,
                      adminPhone: phone,
                      plan: 'STANDARD'
                    });
                  }
                }}>
                  Create Tenant
                </Button>
                <Button variant="outline" onClick={() => setShowCreateTenant(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              {/* Search removed to prevent focus issues */}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending Approval</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>Manage and monitor all tenant accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(tenant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            fetchTenantDetails(tenant.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleTenantStatus(tenant.id, tenant.status)}
                        >
                          {tenant.status === 'ACTIVE' ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Details Modal */}
      {selectedTenant && tenantDetails && (
        <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tenant Details - {selectedTenant.name}</DialogTitle>
              <DialogDescription>
                Detailed information and statistics for this tenant
              </DialogDescription>
            </DialogHeader>
            
            {tenantDetailsLoadingState.loadingState.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{tenantDetails.stats.totalUsers}</div>
                      <p className="text-xs text-gray-500">Total Users</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{tenantDetails.stats.totalRetailers}</div>
                      <p className="text-xs text-gray-500">Retailers</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{formatCurrency(tenantDetails.stats.totalRevenue)}</div>
                      <p className="text-xs text-gray-500">Total Revenue</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{tenantDetails.stats.totalPayments}</div>
                      <p className="text-xs text-gray-500">Total Payments</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Users Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantDetails.users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{user.displayName}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getRoleColor(user.roles[0])}>
                                  {user.roles[0]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {user.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleUserStatus(user.id, selectedTenant.id, user.active)}
                                >
                                  {user.active ? 'Deactivate' : 'Activate'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  // Users Overview Component
  const UsersOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Users Overview</h2>
        <p className="text-gray-600">All users across all tenants</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users by Tenant</CardTitle>
          <CardDescription>Breakdown of users across all tenant organizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.tenantAnalytics.map((tenant) => (
              <div key={tenant.tenantId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{tenant.tenantName}</div>
                    <div className="text-sm text-gray-500">{tenant.retailers} retailers</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{tenant.users} users</div>
                  <div className="text-sm text-gray-500">{tenant.payments} payments</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Line Workers Component
  const LineWorkers = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Line Workers</h2>
        <p className="text-gray-600">Manage line workers across all tenants</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Workers by Tenant</CardTitle>
          <CardDescription>Overview of line workers and their activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.tenantAnalytics.map((tenant) => (
              <div key={tenant.tenantId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">{tenant.tenantName}</div>
                    <div className="text-sm text-gray-500">{tenant.activeUsers} active users</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{tenant.users} total users</div>
                  <div className="text-sm text-gray-500">{tenant.retailers} retailers served</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Worker Activities</CardTitle>
          <CardDescription>Recent activities and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-gray-500">Demo Pharmacy</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">Active</div>
                <div className="text-sm text-gray-500">Last activity: 2 hours ago</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Jane Smith</div>
                  <div className="text-sm text-gray-500">MediStore</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">Active</div>
                <div className="text-sm text-gray-500">Last activity: 1 hour ago</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">Mike Johnson</div>
                  <div className="text-sm text-gray-500">HealthPlus</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">Inactive</div>
                <div className="text-sm text-gray-500">Last activity: 2 days ago</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const getFilteredAnalytics = () => {
    if (!analytics) return null;
    
    if (selectedTenantForAnalytics === 'ALL') {
      return analytics;
    }
    
    const selectedTenantData = analytics.tenantAnalytics.find(t => t.tenantId === selectedTenantForAnalytics);
    if (!selectedTenantData) return analytics;
    
    return {
      ...analytics,
      totalRevenue: selectedTenantData.revenue,
      totalTenants: 1,
      totalUsers: selectedTenantData.users,
      totalRetailers: selectedTenantData.retailers,
      totalPayments: selectedTenantData.payments,
      activeTenants: 1,
      suspendedTenants: 0,
      avgRevenuePerUser: selectedTenantData.avgRevenuePerUser,
      avgRevenuePerRetailer: selectedTenantData.revenue / selectedTenantData.retailers,
      paymentSuccessRate: selectedTenantData.users > 0 ? (selectedTenantData.payments / selectedTenantData.users) * 100 : 0,
      avgCollectionPerUser: selectedTenantData.avgCollectionPerUser,
      tenantAnalytics: [selectedTenantData]
    };
  };

  // Analytics Component
  const Analytics = () => {
    const filteredAnalytics = getFilteredAnalytics();
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
            <p className="text-gray-600">Comprehensive analytics across all tenants</p>
          </div>
          
          {/* Tenant Filter */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="tenant-filter" className="text-sm font-medium">Filter by Tenant:</Label>
            <Select value={selectedTenantForAnalytics} onValueChange={setSelectedTenantForAnalytics}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tenants</SelectItem>
                {analytics?.tenantAnalytics.map((tenant) => (
                  <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.tenantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAnalytics && (
          <>
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Revenue per User</CardTitle>
                  <div className="bg-blue-100 p-2 rounded-full">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredAnalytics.totalUsers > 0 ? formatCurrency(filteredAnalytics.totalRevenue / filteredAnalytics.totalUsers) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-gray-500">Per user across {selectedTenantForAnalytics === 'ALL' ? 'all tenants' : 'selected tenant'}</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Revenue per Retailer</CardTitle>
                  <div className="bg-green-100 p-2 rounded-full">
                    <Store className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredAnalytics.totalRetailers > 0 ? formatCurrency(filteredAnalytics.totalRevenue / filteredAnalytics.totalRetailers) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-gray-500">Per retailer across {selectedTenantForAnalytics === 'ALL' ? 'all tenants' : 'selected tenant'}</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Payment Success Rate</CardTitle>
                  <div className="bg-purple-100 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredAnalytics.totalUsers > 0 ? ((filteredAnalytics.totalPayments / filteredAnalytics.totalUsers) * 100).toFixed(1) : '0'}%
                  </div>
                  <p className="text-xs text-gray-500">Payments per user ratio</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Collection Efficiency</CardTitle>
                  <div className="bg-orange-100 p-2 rounded-full">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredAnalytics.avgCollectionPerUser.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500">Average collections per user</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Distribution</CardTitle>
                  <CardDescription>Revenue breakdown by tenant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredAnalytics.tenantAnalytics
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((tenant, index) => {
                        const percentage = filteredAnalytics.totalRevenue > 0 ? (tenant.revenue / filteredAnalytics.totalRevenue) * 100 : 0;
                        return (
                          <div key={tenant.tenantId} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{tenant.tenantName}</span>
                              <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>{formatCurrency(tenant.revenue)}</span>
                              <span>{tenant.payments} payments</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collection Performance</CardTitle>
                  <CardDescription>Collection performance by tenant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredAnalytics.tenantAnalytics
                      .sort((a, b) => b.avgCollectionPerUser - a.avgCollectionPerUser)
                      .map((tenant) => {
                        return (
                          <div key={tenant.tenantId} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{tenant.tenantName}</span>
                              <span className="text-sm text-gray-500">{tenant.avgCollectionPerUser.toFixed(1)} avg/user</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(tenant.avgCollectionPerUser * 10, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>{tenant.payments} payments</span>
                              <span>{tenant.retailers} retailers</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tenant Performance Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Tenant Performance Matrix</CardTitle>
              <CardDescription>Comprehensive performance analysis for {selectedTenantForAnalytics === 'ALL' ? 'all tenants' : 'selected tenant'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant Name</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Users</TableHead>
                        <TableHead className="text-right">Retailers</TableHead>
                        <TableHead className="text-right">Payments</TableHead>
                        <TableHead className="text-right">Revenue/User</TableHead>
                        <TableHead className="text-right">Avg Collections/User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnalytics.tenantAnalytics
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((tenant) => {
                          const revenuePerUser = tenant.users > 0 ? tenant.revenue / tenant.users : 0;
                          
                          return (
                            <TableRow key={tenant.tenantId}>
                              <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(tenant.revenue)}</TableCell>
                              <TableCell className="text-right">{tenant.users}</TableCell>
                              <TableCell className="text-right">{tenant.retailers}</TableCell>
                              <TableCell className="text-right">{tenant.payments}</TableCell>
                              <TableCell className="text-right">{formatCurrency(revenuePerUser)}</TableCell>
                              <TableCell className="text-right">
                                <Badge className={
                                  tenant.avgCollectionPerUser >= 5 ? 'bg-green-100 text-green-800' :
                                  tenant.avgCollectionPerUser >= 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {tenant.avgCollectionPerUser.toFixed(1)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Insights and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                  <CardDescription>Important observations from the data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-sm">Top Performing Tenant</div>
                        <div className="text-sm text-gray-600">
                          {filteredAnalytics.tenantAnalytics.length > 0 ? 
                            `${filteredAnalytics.tenantAnalytics.reduce((max, tenant) => tenant.revenue > max.revenue ? tenant : max).tenantName} leads with ${formatCurrency(filteredAnalytics.tenantAnalytics.reduce((max, tenant) => tenant.revenue > max.revenue ? tenant : max).revenue)}` :
                            'No tenant data available'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-sm">Highest Collections/User</div>
                        <div className="text-sm text-gray-600">
                          {filteredAnalytics.tenantAnalytics.length > 0 ? 
                          `${filteredAnalytics.tenantAnalytics.reduce((max, tenant) => tenant.avgCollectionPerUser > max.avgCollectionPerUser ? tenant : max).tenantName} has ${filteredAnalytics.tenantAnalytics.reduce((max, tenant) => tenant.avgCollectionPerUser > max.avgCollectionPerUser ? tenant : max).avgCollectionPerUser.toFixed(1)} avg collections per user` :
                          'No tenant data available'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Best Collection Performance</div>
                      <div className="text-sm text-gray-600">
                        {filteredAnalytics.tenantAnalytics.length > 0 ? 
                          (() => {
                            const best = filteredAnalytics.tenantAnalytics.reduce((best, tenant) => 
                              tenant.avgCollectionPerUser > best.avgCollectionPerUser ? tenant : best
                            );
                            return `${best.tenantName} with ${best.avgCollectionPerUser.toFixed(1)} avg collections per user`;
                          })() :
                          'No tenant data available'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Suggested actions based on analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Focus on Low Performance</div>
                      <div className="text-sm text-gray-600">
                        Prioritize follow-up with tenants having below {filteredAnalytics.avgCollectionPerUser.toFixed(1)} avg collections per user
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Improve User Engagement</div>
                      <div className="text-sm text-gray-600">
                        Target tenants with low payment rates to improve user engagement and collection
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Expand Successful Models</div>
                      <div className="text-sm text-gray-600">
                        Analyze and replicate strategies from top-performing tenants across the network
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

  // Activity Component
  const Activity = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
        <p className="text-gray-600">Latest activities across all tenants (last 7 days)</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'success' ? 'bg-green-100' : 
                      activity.type === 'warning' ? 'bg-yellow-100' : 
                      activity.type === 'info' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        activity.type === 'success' ? 'text-green-600' : 
                        activity.type === 'warning' ? 'text-yellow-600' : 
                        activity.type === 'info' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-gray-500">{activity.message}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTimestampWithTime(activity.timestamp)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No recent activities found</p>
                <p className="text-sm text-gray-400">Activities from the last 7 days will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Payments Component
  const Payments = () => {
    const [selectedTenant, setSelectedTenant] = useState<string>('');
    const [tenantPayments, setTenantPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (selectedTenant && tenants.length > 0) {
        loadTenantPayments(selectedTenant);
      }
    }, [selectedTenant]);

    const loadTenantPayments = async (tenantId: string) => {
      setLoading(true);
      try {
        const paymentsData = await paymentService.getAll(tenantId);
        setTenantPayments(paymentsData);
      } catch (error) {
        console.error('Error loading tenant payments:', error);
      } finally {
        setLoading(false);
      }
    };

    const completedPayments = tenantPayments.filter(p => p.state === 'COMPLETED');
    const pendingPayments = tenantPayments.filter(p => ['INITIATED', 'OTP_SENT', 'OTP_VERIFIED'].includes(p.state));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
            <p className="text-gray-600">View payment transactions across all tenants</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedTenant ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Completed Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{completedPayments.length}</div>
                <p className="text-sm text-gray-500">
                  Total: {formatCurrency(completedPayments.reduce((sum, p) => sum + p.totalPaid, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{pendingPayments.length}</div>
                <p className="text-sm text-gray-500">
                  Total: {formatCurrency(pendingPayments.reduce((sum, p) => sum + p.totalPaid, 0))}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-500">Select a tenant to view payments</p>
            </CardContent>
          </Card>
        )}

        {selectedTenant && !loading && tenantPayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Line Worker</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantPayments
                      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatTimestampWithTime(payment.createdAt)}</TableCell>
                          <TableCell>{payment.retailerName}</TableCell>
                          <TableCell>{payment.lineWorkerId ? 'Line Worker' : 'Unknown'}</TableCell>
                          <TableCell>{formatCurrency(payment.totalPaid)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>
                            <Badge className={
                              payment.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              payment.state === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {payment.state}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading payments...</span>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Settings Component
  const Settings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">System-wide settings and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Configure system-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-gray-500">Send email notifications for important events</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">SMS Notifications</div>
                <div className="text-sm text-gray-500">Send SMS notifications for critical alerts</div>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto Backup</div>
                <div className="text-sm text-gray-500">Automatically backup system data daily</div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Configure security and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-gray-500">Require 2FA for all admin users</div>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Session Timeout</div>
                <div className="text-sm text-gray-500">Automatically log out after 30 minutes</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">IP Restrictions</div>
                <div className="text-sm text-gray-500">Restrict access by IP address</div>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Main component return - no global loading state

  if (!isSuperAdmin) {
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

  return (
    <>
      <StatusBarColor theme="white" />
      
      {/* Loading Overlay */}
      <LoadingOverlay 
        isLoading={mainLoadingState.loadingState.isLoading}
        message="Loading dashboard data..."
        progress={dataFetchProgress}
        variant="fullscreen"
      />
      
      <div className="min-h-screen bg-gray-50 flex flex-col dashboard-screen">
        {/* Navigation */}
        <DashboardNavigation
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          navItems={navItems}
          title="PharmaLync"
          subtitle="Super Admin Dashboard"
        notificationCount={notificationCount}
        notifications={notifications}
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="flex-1 pt-20 sm:pt-16 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
        {/* Header with refresh */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {navItems.find(item => item.id === activeNav)?.label || 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatTimestampWithTime(lastUpdate)}
            </p>
          </div>
          <LoadingButton 
            isLoading={mainLoadingState.loadingState.isRefreshing}
            loadingText="Refreshing..."
            onClick={refreshData} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </LoadingButton>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content based on active navigation */}
        <div className="space-y-6">
            {activeNav === 'overview' && <Overview />}
            {activeNav === 'tenants' && <TenantsManagement />}
            {activeNav === 'users' && <UsersOverview />}
            {activeNav === 'line-workers' && <LineWorkers />}
            {activeNav === 'payments' && <Payments />}
            {activeNav === 'analytics' && <Analytics />}
            {activeNav === 'activity' && <Activity />}
            {activeNav === 'settings' && <Settings />}

            <div>
                     <div className="px-4 pb-20 pt-2 text-left">

                        {/* Tagline */}
                        <h2
                          className="fw-bold lh-sm"
                          style={{
                            fontSize: "2.2rem",
                            lineHeight: "1.2",
                            color: "rgba(75, 75, 75, 1)",
                            fontWeight: 700,
                          }}
                        >
                          Payment <br />s
                          Collection Made<br />
                          More Secure{" "}
                          <Heart
                            className="inline-block"
                            size={30}
                            fill="red"
                            color="red"
                          />
                        </h2>

                        {/* Divider line */}
                        <hr
                          style={{
                            borderTop: "1px solid rgba(75, 75, 75, 1)",
                            margin: "18px 0",
                          }}
                        />

                        {/* App name */}
                        <p
                          style={{
                            fontSize: "1rem",
                            color: "rgba(75, 75, 75, 1)",
                            fontWeight: 500,
                          }}
                        >
                          PharmaLync
                        </p>
                      </div>
            </div>
          </div>
      </main>
      
      {/* Success Feedback */}
      <SuccessFeedback 
        show={feedback.show}
        message={feedback.message}
        onClose={hideSuccess}
      />
    </div>

    </>
  );
}