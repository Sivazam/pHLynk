'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Store, 
  Calendar,
  Target,
  Zap,
  Award,
  Download,
  RefreshCw,
  MapPin,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/timestamp-utils';
import { Retailer, Payment, User } from '@/types';
import { DashboardService } from '@/services/firestore';

interface EnhancedWorker extends User {
  totalCollected: number;
  paymentCount: number;
  successRate: number;
}

interface WholesalerAnalyticsProps {
  retailers: Retailer[];
  payments: Payment[];
  lineWorkers: User[];
  areas: any[];
  onRefresh?: () => void;
  refreshLoading?: boolean;
}

interface AnalyticsData {
  totalRevenue: number;
  collectionRate: number;
  avgCollectionPerWorker: number;
  topPerformers: EnhancedWorker[];
  areasPerformance: any[];
  monthlyTrends: any[];
  retailerInsights: any[];
}

export function WholesalerAnalytics({ 
  retailers, 
  payments, 
  lineWorkers, 
  areas,
  onRefresh,
  refreshLoading = false,
  tenantId
}: WholesalerAnalyticsProps & { tenantId?: string }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [monthlyTargets, setMonthlyTargets] = useState([
    { month: 'Jan', target: 100000 },
    { month: 'Feb', target: 110000 },
    { month: 'Mar', target: 120000 },
    { month: 'Apr', target: 130000 },
    { month: 'May', target: 140000 },
    { month: 'Jun', target: 150000 },
    { month: 'Jul', target: 160000 },
    { month: 'Aug', target: 170000 },
    { month: 'Sep', target: 180000 },
    { month: 'Oct', target: 190000 },
    { month: 'Nov', target: 200000 },
    { month: 'Dec', target: 210000 },
  ]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Load monthly targets from database
  useEffect(() => {
    const loadTargets = async () => {
      if (!tenantId) return;
      
      setLoadingTargets(true);
      try {
        const currentYear = new Date().getFullYear();
        const savedTargets = await DashboardService.getMonthlyTargets(tenantId, currentYear);
        
        if (savedTargets && savedTargets.targets.length > 0) {
          setMonthlyTargets(savedTargets.targets);
          console.log('✅ Loaded monthly targets from database:', savedTargets.targets);
        } else {
          console.log('ℹ️ No saved targets found, using defaults');
        }
      } catch (error) {
        console.error('❌ Error loading monthly targets:', error);
      } finally {
        setLoadingTargets(false);
      }
    };

    loadTargets();
  }, [tenantId]);

  const handleTargetChange = (month: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setMonthlyTargets(prev => 
      prev.map(target => 
        target.month === month 
          ? { ...target, target: numericValue }
          : target
      )
    );
  };

  const handleSaveTargets = async () => {
    if (!tenantId) {
      console.error('❌ No tenantId provided');
      return;
    }

    try {
      setLoadingTargets(true);
      const currentYear = new Date().getFullYear();
      await DashboardService.saveMonthlyTargets(tenantId, monthlyTargets, currentYear);
      
      console.log('✅ Monthly targets saved successfully:', monthlyTargets);
      setShowTargetDialog(false);
      
      // Trigger a refresh to update the analytics with new targets
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('❌ Error saving monthly targets:', error);
      // You might want to show an error message to the user here
    } finally {
      setLoadingTargets(false);
    }
  };

  const analytics: AnalyticsData = useMemo(() => {
    // Calculate basic metrics
    const completedPayments = payments.filter(p => p.state === 'COMPLETED');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalInvoiced = 0; // Invoices have been removed from the application
    const collectionRate = 0; // Invoices have been removed, so collection rate is not applicable
    const avgCollectionPerWorker = lineWorkers.length > 0 ? totalRevenue / lineWorkers.length : 0;

    // Top performers (line workers)
    const workerPerformance: EnhancedWorker[] = lineWorkers.map(worker => {
      const workerPayments = completedPayments.filter(p => p.lineWorkerId === worker.id);
      const workerRevenue = workerPayments.reduce((sum, p) => sum + p.totalPaid, 0);
      const successRate = workerPayments.length > 0 ? 100 : 0;
      
      return {
        ...worker,
        totalCollected: workerRevenue,
        paymentCount: workerPayments.length,
        successRate
      };
    }).sort((a, b) => b.totalCollected - a.totalCollected).slice(0, 5);

    // Area performance
    const areasPerformance = areas.map(area => {
      const areaRetailers = retailers.filter(r => r.areaId === area.id);
      const areaRevenue = completedPayments.filter(p => {
        const retailer = retailers.find(r => r.id === p.retailerId);
        return retailer?.areaId === area.id;
      }).reduce((sum, p) => sum + p.totalPaid, 0);
      
      return {
        ...area,
        retailerCount: areaRetailers.length,
        totalCollected: areaRevenue,
        avgPerRetailer: areaRetailers.length > 0 ? areaRevenue / areaRetailers.length : 0
      };
    }).sort((a, b) => b.totalCollected - a.totalCollected);

    // Monthly trends - using real revenue data from payments
    const currentYear = new Date().getFullYear();
    const monthlyRevenueData: { [key: string]: number } = {};
    
    // Initialize all months with 0 revenue
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => {
      monthlyRevenueData[month] = 0;
    });

    // Calculate real revenue from completed payments
    completedPayments.forEach(payment => {
      if (payment.timeline.completedAt) {
        const completedDate = payment.timeline.completedAt.toDate();
        if (completedDate.getFullYear() === currentYear) {
          const monthIndex = completedDate.getMonth();
          const monthName = months[monthIndex];
          monthlyRevenueData[monthName] += payment.totalPaid;
        }
      }
    });

    // Create monthly trends using real revenue data and saved targets
    const monthlyTrends = months.slice(0, 6).map(month => ({
      month,
      revenue: monthlyRevenueData[month],
      target: monthlyTargets.find(t => t.month === month)?.target || 100000
    }));

    // Retailer insights
    const retailerInsights = retailers
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name instead of outstanding
      .slice(0, 10)
      .map(retailer => ({
        ...retailer,
        paymentCount: completedPayments.filter(p => p.retailerId === retailer.id).length,
        lastPayment: completedPayments
          .filter(p => p.retailerId === retailer.id)
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]
      }));

    return {
      totalRevenue,
      collectionRate,
      avgCollectionPerWorker,
      topPerformers: workerPerformance,
      areasPerformance,
      monthlyTrends,
      retailerInsights
    };
  }, [retailers, payments, lineWorkers, areas, monthlyTargets]);

  // Skeleton components
  const KeyMetricsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-l-4 border-l-gray-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TopPerformersSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const AreaPerformanceSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const RetailerInsightsSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const MonthlyTrendsSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-16 h-4" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      {refreshLoading ? (
        <KeyMetricsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5% from last period
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Collection Rate</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.collectionRate.toFixed(1)}%
              </div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.1% improvement
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg per Worker</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.avgCollectionPerWorker)}
              </div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.3% increase
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performers & Area Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {refreshLoading ? (
          <>
            <TopPerformersSkeleton />
            <AreaPerformanceSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Top Performing Line Workers
                </CardTitle>
                <CardDescription>
                  Best collection performers this period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topPerformers.map((worker, index) => (
                    <div key={worker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{worker.displayName}</p>
                          <p className="text-sm text-gray-600">{worker.paymentCount} collections</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {formatCurrency(worker.totalCollected)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {worker.successRate.toFixed(0)}% success
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Area Performance
                </CardTitle>
                <CardDescription>
                  Collection performance by service area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.areasPerformance.slice(0, 5).map((area, index) => (
                    <div key={area.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{area.name}</p>
                          <p className="text-sm text-gray-600">{area.retailerCount} retailers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {formatCurrency(area.totalCollected)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(area.avgPerRetailer)} avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Retailer Insights */}
      {refreshLoading ? (
        <RetailerInsightsSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Retailer Insights
            </CardTitle>
            <CardDescription>
              Overview of all retailers in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.retailerInsights.map((retailer) => (
                    <TableRow key={retailer.id}>
                      <TableCell className="font-medium">{retailer.name}</TableCell>
                      <TableCell>{retailer.paymentCount}</TableCell>
                      <TableCell>
                        {retailer.lastPayment 
                          ? retailer.lastPayment.createdAt.toDate().toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Active
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

      {/* Monthly Trends */}
      {refreshLoading ? (
        <MonthlyTrendsSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col  pt-16 sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Monthly Collection Trends
                </CardTitle>
                <CardDescription>
                  Revenue trends vs targets over time
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowTargetDialog(true)}>
                <Target className="h-4 w-4 mr-2" />
                Set Targets
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mobile: Single column, Tablet: 2 columns, Desktop: 3 columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.monthlyTrends.map((trend) => (
                  <div key={trend.month} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      {/* Month Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{trend.month}</h3>
                        <Badge variant={trend.revenue >= trend.target ? 'default' : 'secondary'}>
                          {trend.revenue >= trend.target ? 'Target Met' : 'Below Target'}
                        </Badge>
                      </div>
                      
                      {/* Revenue vs Target */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Revenue:</span>
                          <span className="font-medium">{formatCurrency(trend.revenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Target:</span>
                          <span className="font-medium">{formatCurrency(trend.target)}</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              trend.revenue >= trend.target 
                                ? 'bg-green-500' 
                                : trend.revenue >= trend.target * 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((trend.revenue / trend.target) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {((trend.revenue / trend.target) * 100).toFixed(1)}% of target
                          </span>
                          <span className={`text-xs font-medium ${
                            trend.revenue >= trend.target 
                              ? 'text-green-600' 
                              : trend.revenue >= trend.target * 0.8 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                          }`}>
                            {trend.revenue >= trend.target ? '+' : ''}
                            {formatCurrency(trend.revenue - trend.target)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Target Management Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Monthly Collection Targets
            </DialogTitle>
            <DialogDescription>
              Set revenue targets for each month to track performance against goals
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {monthlyTargets.map((target) => (
                <div key={target.month} className="space-y-2">
                  <Label htmlFor={`target-${target.month}`} className="text-sm font-medium">
                    {target.month} Target
                  </Label>
                  <Input
                    id={`target-${target.month}`}
                    type="number"
                    value={target.target}
                    onChange={(e) => handleTargetChange(target.month, e.target.value)}
                    placeholder="Enter target amount"
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">
                    Current: {formatCurrency(target.target)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const baseAmount = 100000;
                    setMonthlyTargets(monthlyTargets.map((target, index) => ({
                      ...target,
                      target: baseAmount + (index * 10000)
                    })));
                  }}
                >
                  Set Progressive (+10k/month)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const baseAmount = 150000;
                    setMonthlyTargets(monthlyTargets.map((target, index) => ({
                      ...target,
                      target: baseAmount + (index * 5000)
                    })));
                  }}
                >
                  Set Aggressive (+5k/month)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setMonthlyTargets(monthlyTargets.map(target => ({
                      ...target,
                      target: 100000
                    })));
                  }}
                >
                  Reset to 100k
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTargetDialog(false)} disabled={loadingTargets}>
              Cancel
            </Button>
            <Button onClick={handleSaveTargets} disabled={loadingTargets}>
              {loadingTargets ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Targets'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}