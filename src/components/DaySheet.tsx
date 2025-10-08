'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateRangeFilter, DateRangeOption } from '@/components/ui/DateRangeFilter';
import { 
  Download, 
  Calendar, 
  Users, 
  MapPin, 
  Store, 
  Filter,
  FileSpreadsheet,
  TrendingUp,
  Clock
} from 'lucide-react';
import { formatTimestamp, formatTimestampWithTime, formatCurrency, toDate } from '@/lib/timestamp-utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Payment, User, Area, Retailer } from '@/types';

interface DaySheetProps {
  payments: Payment[];
  lineWorkers: User[];
  areas: Area[];
  retailers: Retailer[];
  wholesalerName: string;
  tenantId: string;
}

interface DaySheetData {
  paymentId: string;
  date: Date;
  time: string;
  lineWorkerName: string;
  lineWorkerArea: string;
  retailerName: string;
  retailerAddress: string;
  retailerArea: string;
  amount: number;
  paymentMethod: string;
}

export function DaySheet({
  payments,
  lineWorkers,
  areas,
  retailers,
  wholesalerName,
  tenantId
}: DaySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLineWorker, setSelectedLineWorker] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedRetailer, setSelectedRetailer] = useState<string>('all');
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

  const handleDateRangeChange = (value: string, newDateRange: { startDate: Date; endDate: Date }) => {
    setSelectedDateRangeOption(value);
    setDateRange(newDateRange);
  };

  // Get area name by ID
  const getAreaName = (areaId: string): string => {
    const area = areas.find(a => a.id === areaId);
    return area?.name || 'Unknown Area';
  };

  // Get line worker name by ID
  const getLineWorkerName = (lineWorkerId: string): string => {
    const worker = lineWorkers.find(w => w.id === lineWorkerId);
    return worker?.displayName || 'Unknown Line Worker';
  };

  // Get line worker assigned areas
  const getLineWorkerAreas = (lineWorkerId: string): string[] => {
    const worker = lineWorkers.find(w => w.id === lineWorkerId);
    return worker?.assignedAreas || [];
  };

  // Get retailer name by ID
  const getRetailerName = (retailerId: string): string => {
    const retailer = retailers.find(r => r.id === retailerId);
    return retailer?.name || 'Unknown Retailer';
  };

  // Get retailer details by ID
  const getRetailerDetails = (retailerId: string) => {
    const retailer = retailers.find(r => r.id === retailerId);
    return retailer || { name: 'Unknown Retailer', address: 'Not provided', areaId: '' };
  };

  // Filter and process data
  const filteredData = useMemo(() => {
    let filtered = filterPaymentsByDateRange(payments);

    // Filter by line worker
    if (selectedLineWorker !== 'all') {
      filtered = filtered.filter(payment => payment.lineWorkerId === selectedLineWorker);
    }

    // Filter by area
    if (selectedArea !== 'all') {
      filtered = filtered.filter(payment => {
        const retailer = retailers.find(r => r.id === payment.retailerId);
        return retailer?.areaId === selectedArea;
      });
    }

    // Filter by retailer
    if (selectedRetailer !== 'all') {
      filtered = filtered.filter(payment => payment.retailerId === selectedRetailer);
    }

    // Process data for display
    return filtered.map(payment => {
      const retailer = getRetailerDetails(payment.retailerId);
      const lineWorkerName = getLineWorkerName(payment.lineWorkerId);
      const lineWorkerAreas = getLineWorkerAreas(payment.lineWorkerId);
      const lineWorkerAreaNames = lineWorkerAreas.map(areaId => getAreaName(areaId || '')).join(', ');

      return {
        paymentId: payment.id,
        date: payment.createdAt.toDate(),
        time: formatTimestampWithTime(payment.createdAt),
        lineWorkerName,
        lineWorkerArea: lineWorkerAreaNames || 'No assigned area',
        retailerName: retailer.name,
        retailerAddress: retailer.address,
        retailerArea: getAreaName(retailer.areaId || ''),
        amount: payment.totalPaid,
        paymentMethod: payment.method
      } as DaySheetData;
    });
  }, [payments, selectedLineWorker, selectedArea, selectedRetailer, dateRange, lineWorkers, areas, retailers]);

  // Calculate totals
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalCollections = filteredData.length;

  // Generate Excel file
  const generateExcel = () => {
    // Prepare data for Excel
    const excelData = filteredData.map(item => ({
      'Payment ID': item.paymentId,
      'Date': formatTimestamp(item.date),
      'Time': item.time,
      'Line Worker Name': item.lineWorkerName,
      'Assigned Areas': item.lineWorkerArea,
      'Retailer Name': item.retailerName,
      'Retailer Address': item.retailerAddress,
      'Retailer Area': item.retailerArea,
      'Amount': item.amount,
      'Payment Method': item.paymentMethod
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Day Sheet');

    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Total Collections', 'Value': totalCollections },
      { 'Metric': 'Total Amount', 'Value': totalAmount },
      { 'Metric': 'Average Collection', 'Value': totalCollections > 0 ? totalAmount / totalCollections : 0 },
      { 'Metric': 'Date Range', 'Value': `${formatTimestamp(dateRange.startDate)} - ${formatTimestamp(dateRange.endDate)}` },
      { 'Metric': 'Wholesaler', 'Value': wholesalerName },
      { 'Metric': 'Generated On', 'Value': formatTimestampWithTime(new Date()) }
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate file name
    const fileName = `DaySheet_${wholesalerName.replace(/\s+/g, '_')}_${formatTimestamp(dateRange.startDate)}.xlsx`;

    // Save file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, fileName);
  };

  // Get unique line workers for filter
  const uniqueLineWorkers = useMemo(() => {
    const workerIds = [...new Set(payments.map(p => p.lineWorkerId))];
    return workerIds.map(id => ({
      id,
      name: getLineWorkerName(id)
    }));
  }, [payments, lineWorkers]);

  // Get unique areas for filter
  const uniqueAreas = useMemo(() => {
    const areaIds = [...new Set(payments.map(p => {
      const retailer = retailers.find(r => r.id === p.retailerId);
      return retailer?.areaId;
    }).filter(Boolean))];
    return areaIds.map(id => ({
      id,
      name: getAreaName(id || '')
    }));
  }, [payments, retailers, areas]);

  // Get unique retailers for filter
  const uniqueRetailers = useMemo(() => {
    const retailerIds = [...new Set(payments.map(p => p.retailerId))];
    return retailerIds.map(id => ({
      id,
      name: getRetailerName(id)
    }));
  }, [payments, retailers]);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2"
        variant="outline"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span>Day Sheet</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span>Day Sheet - {wholesalerName}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Line Worker</span>
              </label>
              <Select value={selectedLineWorker} onValueChange={setSelectedLineWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="All line workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Line Workers</SelectItem>
                  {uniqueLineWorkers.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Area</span>
              </label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {uniqueAreas.map(area => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Store className="h-4 w-4" />
                <span>Retailer</span>
              </label>
              <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
                <SelectTrigger>
                  <SelectValue placeholder="All retailers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Retailers</SelectItem>
                  {uniqueRetailers.map(retailer => (
                    <SelectItem key={retailer.id} value={retailer.id}>
                      {retailer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Date Range</span>
              </label>
              <DateRangeFilter
                value={selectedDateRangeOption}
                onChange={handleDateRangeChange}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCollections}</div>
                <p className="text-xs text-muted-foreground">
                  Payment transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <div className="h-4 w-4 text-green-600">₹</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Collected amount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Collection</CardTitle>
                <div className="h-4 w-4 text-blue-600">₹</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalCollections > 0 ? totalAmount / totalCollections : 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Collection Details</CardTitle>
                <CardDescription>
                  {filteredData.length} transactions found
                </CardDescription>
              </div>
              <Button onClick={generateExcel} className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Line Worker</TableHead>
                      <TableHead>Assigned Areas</TableHead>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Retailer Area</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No collections found for the selected criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, index) => (
                        <TableRow key={`${item.paymentId}-${index}`}>
                          <TableCell>{formatTimestamp(item.date)}</TableCell>
                          <TableCell>{item.time}</TableCell>
                          <TableCell className="font-medium">{item.lineWorkerName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.lineWorkerArea}</TableCell>
                          <TableCell className="font-medium">{item.retailerName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.retailerArea}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.paymentMethod}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Footer Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <strong>Summary:</strong> {totalCollections} collections totaling {formatCurrency(totalAmount)}
              </div>
              <div className="text-sm text-gray-500">
                Generated on {formatTimestampWithTime(new Date())}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}