'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
import { Retailer, Payment, User, Invoice } from '@/types';

interface WholesalerAnalyticsProps {
  retailers: Retailer[];
  payments: Payment[];
  lineWorkers: User[];
  invoices: Invoice[];
  areas: any[];
  onRefresh?: () => void;
  refreshLoading?: boolean;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOutstanding: number;
  collectionRate: number;
  avgCollectionPerWorker: number;
  topPerformers: User[];
  areasPerformance: any[];
  monthlyTrends: any[];
  retailerInsights: any[];
}

export function WholesalerAnalytics({ 
  retailers, 
  payments, 
  lineWorkers, 
  invoices, 
  areas,
  onRefresh,
  refreshLoading = false
}: WholesalerAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const analytics: AnalyticsData = useMemo(() => {
    // Calculate basic metrics
    const completedPayments = payments.filter(p => p.state === 'COMPLETED');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalOutstanding = retailers.reduce((sum, r) => sum + r.currentOutstanding, 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;
    const avgCollectionPerWorker = lineWorkers.length > 0 ? totalRevenue / lineWorkers.length : 0;

    // Top performers (line workers)
    const workerPerformance = lineWorkers.map(worker => {
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

    // Monthly trends (simplified)
    const monthlyTrends = [
      { month: 'Jan', revenue: 125000, target: 100000 },
      { month: 'Feb', revenue: 145000, target: 110000 },
      { month: 'Mar', revenue: 165000, target: 120000 },
      { month: 'Apr', revenue: 155000, target: 130000 },
      { month: 'May', revenue: 175000, target: 140000 },
      { month: 'Jun', revenue: 185000, target: 150000 },
    ];

    // Retailer insights
    const retailerInsights = retailers
      .sort((a, b) => b.currentOutstanding - a.currentOutstanding)
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
      totalOutstanding,
      collectionRate,
      avgCollectionPerWorker,
      topPerformers: workerPerformance,
      areasPerformance,
      monthlyTrends,
      retailerInsights
    };
  }, [retailers, payments, lineWorkers, invoices, areas]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into your collection performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => onRefresh && onRefresh()}
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

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

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalOutstanding)}
              </div>
              <div className="flex items-center text-xs text-red-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                -5.2% from last month
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
              Retailer Insights - High Outstanding
            </CardTitle>
            <CardDescription>
              Retailers requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.retailerInsights.map((retailer) => (
                    <TableRow key={retailer.id}>
                      <TableCell className="font-medium">{retailer.name}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        {formatCurrency(retailer.currentOutstanding)}
                      </TableCell>
                      <TableCell>{retailer.paymentCount}</TableCell>
                      <TableCell>
                        {retailer.lastPayment 
                          ? retailer.lastPayment.createdAt.toDate().toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={retailer.currentOutstanding > 10000 ? 'destructive' : 'secondary'}>
                          {retailer.currentOutstanding > 10000 ? 'High Priority' : 'Normal'}
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
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Monthly Collection Trends
            </CardTitle>
            <CardDescription>
              Revenue trends vs targets over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyTrends.map((trend) => (
                <div key={trend.month} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 text-sm font-medium text-gray-600">{trend.month}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Revenue: {formatCurrency(trend.revenue)}</span>
                        <span>Target: {formatCurrency(trend.target)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((trend.revenue / trend.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={trend.revenue >= trend.target ? 'default' : 'secondary'}>
                      {trend.revenue >= trend.target ? 'Target Met' : 'Below Target'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {((trend.revenue / trend.target) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}