'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import {
  Download,
  Calendar,
  Users,
  MapPin,
  Store,
  Filter,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  X,
  Building2
} from 'lucide-react';
import { formatTimestamp, formatTimestampWithTime, formatCurrency, toDate, formatDateForExport } from '@/lib/timestamp-utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Payment, User, Area, Retailer } from '@/types';

interface DaySheetProps {
  payments: Payment[];
  lineWorkers: User[];
  areas: Area[];
  retailers: Retailer[];
  wholesalerBusinessName: string;
  wholesalerAddress?: string;
  tenantId: string;
  hideLineWorkerFilter?: boolean;
}

interface DaySheetData {
  paymentId: string;
  date: Date;
  time: string;
  lineWorkerName: string;
  lineWorkerArea: string;
  retailerName: string;
  retailerCode: string;
  retailerAddress: string;
  retailerArea: string;
  amount: number;
  paymentMethod: string;
  utr?: string;
  exportDate: string;
}

export function DaySheet({
  payments,
  lineWorkers,
  areas,
  retailers,
  wholesalerBusinessName,
  wholesalerAddress,
  tenantId,
  hideLineWorkerFilter = false
}: DaySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLineWorker, setSelectedLineWorker] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedRetailer, setSelectedRetailer] = useState<string>('all');
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

  // Get retailer name by ID (handles both legacy and new profile formats)
  const getRetailerName = (retailerId: string): string => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (retailer?.profile?.realName) {
      return retailer.profile.realName;
    }
    return retailer?.name || 'Unknown Retailer';
  };

  // Get retailer details by ID (handles both legacy and new profile formats)
  const getRetailerDetails = (retailerId: string) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (retailer) {
      const name = retailer.profile?.realName || retailer.name || 'Unknown Retailer';
      const address = retailer.profile?.address || retailer.address || 'Not provided';
      const code = retailer.code || retailer.id.slice(0, 6).toUpperCase();
      return { name, address, areaId: retailer.areaId || '', code };
    }
    return { name: 'Unknown Retailer', address: 'Not provided', areaId: '', code: 'N/A' };
  };

  // Filter and process data
  const filteredData = useMemo(() => {
    let filtered = filterPaymentsByDateRange(payments);

    // Only include completed payments (exclude initiated but not completed)
    filtered = filtered.filter(payment => payment.state === 'COMPLETED');

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

    // Sort: Group by Payment Method (Cash first usually preferred), then by Time
    filtered.sort((a, b) => {
      if (a.method !== b.method) {
        return a.method.localeCompare(b.method);
      }
      return a.createdAt.toMillis() - b.createdAt.toMillis();
    });

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
        lineWorkerArea: '', // Removing from UI as requested
        retailerName: retailer.name,
        retailerCode: retailer.code,
        retailerAddress: retailer.address,
        retailerArea: getAreaName(retailer.areaId || ''),
        amount: payment.totalPaid,
        paymentMethod: payment.method,
        utr: payment.utr,
        exportDate: formatDateForExport(payment.createdAt)
      } as DaySheetData;
    });
  }, [payments, selectedLineWorker, selectedArea, selectedRetailer, dateRange, lineWorkers, areas, retailers]);

  // Calculate totals
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalCollections = filteredData.length;

  // Method-wise totals
  const cashTotal = filteredData.filter(i => i.paymentMethod === 'CASH').reduce((sum, i) => sum + i.amount, 0);
  const upiTotal = filteredData.filter(i => i.paymentMethod === 'UPI').reduce((sum, i) => sum + i.amount, 0);

  // Generate Excel file
  const generateExcel = () => {
    // Determine which columns to include
    // Determine which columns to include
    const showLineWorkerColumn = !hideLineWorkerFilter && selectedLineWorker === 'all';
    const showAreaColumn = selectedArea === 'all';

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare content (match CSV structure)
    const reportTitle = [['Report: Day Sheet']];
    const dateInfo = [[`Date Range: ${formatTimestamp(dateRange.startDate)} - ${formatTimestamp(dateRange.endDate)}`]];

    // Filter info
    const filterInfo: string[][] = [];
    if (!showLineWorkerColumn) {
      filterInfo.push([`Line Worker: ${getLineWorkerName(selectedLineWorker)}`]);
    }
    if (!showAreaColumn) {
      filterInfo.push([`Service Area: ${getAreaName(selectedArea)}`]);
    }

    // Column Headers
    const headers = ['Date', 'Retailer Code', 'Retailer Name', 'Amount Collected', 'Payment Method', 'UTR Number'];
    if (showLineWorkerColumn) headers.push('Line Worker');
    if (showAreaColumn) headers.push('Service Area');

    // Data Rows
    const dataRows = filteredData.map(item => {
      const row = [
        item.exportDate,
        item.retailerCode,
        item.retailerName,
        item.amount,
        item.paymentMethod,
        item.utr || ''
      ];
      if (showLineWorkerColumn) row.push(item.lineWorkerName);
      if (showAreaColumn) row.push(item.retailerArea);
      return row;
    });

    // Grand Total Row
    const cashTotalRow = ['', 'Total Cash', '', cashTotal, 'CASH', '', ''];
    const upiTotalRow = ['', 'Total UPI', '', upiTotal, 'UPI', '', ''];
    const grandTotalRow = ['', 'Grand Total', '', totalAmount, '', '', ''];
    if (showLineWorkerColumn) {
      cashTotalRow.push('');
      upiTotalRow.push('');
      grandTotalRow.push('');
    }
    if (showAreaColumn) {
      cashTotalRow.push('');
      upiTotalRow.push('');
      grandTotalRow.push('');
    }

    // Combine all data
    const wsData = [
      ...reportTitle,
      ...dateInfo,
      ...filterInfo,
      [], // Empty row
      headers,
      ...dataRows,
      [], // Empty row
      cashTotalRow,
      upiTotalRow,
      grandTotalRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Date
      { wch: 15 }, // Code
      { wch: 30 }, // Name
      { wch: 15 }, // Amount
      { wch: 15 }, // Method
      { wch: 20 }, // UTR
      ...(showLineWorkerColumn ? [{ wch: 20 }] : []),
      ...(showAreaColumn ? [{ wch: 20 }] : [])
    ];
    ws['!cols'] = colWidths;

    // Styling
    // Title Bold
    if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } };

    // Headers Bold (row index depends on filter info length)
    const headerRowIdx = reportTitle.length + dateInfo.length + filterInfo.length + 1; // +1 for empty row
    // Note: This styling logic is simplified; basic bolding for A1 is good enough for now

    XLSX.utils.book_append_sheet(wb, ws, 'Day Sheet');

    // Generate file name logic
    const formatDateForFn = (d: Date) => {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };

    let dateStr = formatDateForFn(dateRange.startDate);
    if (formatDateForFn(dateRange.startDate) !== formatDateForFn(dateRange.endDate)) {
      dateStr += `_${formatDateForFn(dateRange.endDate)}`;
    }

    let areaStr = 'All_Areas';
    if (selectedArea !== 'all') {
      areaStr = getAreaName(selectedArea).replace(/\s+/g, '_');
    }

    let workerStr = 'All_Workers';
    if (selectedLineWorker !== 'all') {
      workerStr = getLineWorkerName(selectedLineWorker).replace(/\s+/g, '_');
    } else if (hideLineWorkerFilter && lineWorkers.length > 0) {
      // If filter is hidden, usually implies filtered to a single worker (the current user)
      workerStr = lineWorkers[0].displayName?.replace(/\s+/g, '_') || 'Worker';
    }

    const fileName = `${dateStr}_${areaStr}_${workerStr}.xlsx`.toLowerCase();

    // Save file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, fileName);
  };

  // Generate CSV file with custom format
  const generateCSV = () => {
    const rows: string[] = [];

    // Header section
    rows.push('Report: Day Sheet');
    rows.push(`"Date Range: ${formatTimestamp(dateRange.startDate)} - ${formatTimestamp(dateRange.endDate)}"`);

    // Filter details
    if (selectedLineWorker !== 'all') {
      rows.push(`"Line Worker: ${getLineWorkerName(selectedLineWorker)}"`);
    }
    if (selectedArea !== 'all') {
      rows.push(`"Service Area: ${getAreaName(selectedArea)}"`);
    }
    rows.push(''); // Empty row

    // Determine which columns to include
    const showLineWorkerColumn = !hideLineWorkerFilter && selectedLineWorker === 'all';
    const showAreaColumn = selectedArea === 'all';

    // Column headers
    const headers = ['Date', 'Retailer Code', 'Retailer Name', 'Amount Collected', 'Payment Method', 'UTR Number'];
    if (showLineWorkerColumn) headers.push('Line Worker');
    if (showAreaColumn) headers.push('Service Area');
    rows.push(headers.join(','));

    // Data rows
    filteredData.forEach(item => {
      const rowData = [
        `"${item.exportDate}"`,
        `"${item.retailerCode}"`,
        `"${item.retailerName}"`,
        item.amount.toString(),
        item.paymentMethod,
        `"${item.utr || ''}"`
      ];
      if (showLineWorkerColumn) rowData.push(`"${item.lineWorkerName}"`);
      if (showAreaColumn) rowData.push(`"${item.retailerArea}"`);
      rows.push(rowData.join(','));
    });

    // Empty row before total
    rows.push('');

    // Grand Total row
    let cashRow = ['', 'Total Cash', '', cashTotal.toString(), 'CASH', '', ''];
    if (showLineWorkerColumn) cashRow.push('');
    if (showAreaColumn) cashRow.push('');
    rows.push(cashRow.join(','));

    let upiRow = ['', 'Total UPI', '', upiTotal.toString(), 'UPI', '', ''];
    if (showLineWorkerColumn) upiRow.push('');
    if (showAreaColumn) upiRow.push('');
    rows.push(upiRow.join(','));

    const totalRow = ['', 'Grand Total', '', totalAmount.toString(), '', ''];
    if (showLineWorkerColumn) totalRow.push('');
    if (showAreaColumn) totalRow.push('');
    rows.push(totalRow.join(','));

    // Create and download file
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Generate file name logic
    const formatDateForFn = (d: Date) => {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };

    let dateStr = formatDateForFn(dateRange.startDate);
    if (formatDateForFn(dateRange.startDate) !== formatDateForFn(dateRange.endDate)) {
      dateStr += `_${formatDateForFn(dateRange.endDate)}`;
    }

    let areaStr = 'All_Areas';
    if (selectedArea !== 'all') {
      areaStr = getAreaName(selectedArea).replace(/\s+/g, '_');
    }

    let workerStr = 'All_Workers';
    if (selectedLineWorker !== 'all') {
      workerStr = getLineWorkerName(selectedLineWorker).replace(/\s+/g, '_');
    } else if (hideLineWorkerFilter && lineWorkers.length > 0) {
      workerStr = lineWorkers[0].displayName?.replace(/\s+/g, '_') || 'Worker';
    }

    const fileName = `${dateStr}_${areaStr}_${workerStr}.csv`.toLowerCase();

    saveAs(blob, fileName);
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
    }).filter((id): id is string => Boolean(id)))];
    return areaIds.map(id => ({
      id,
      name: getAreaName(id)
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

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-lg sm:text-xl font-bold flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 flex-shrink-0" />
                  <span className="break-all sm:break-normal">Day Sheet - {wholesalerBusinessName}</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 sm:static text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

              <div className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {!hideLineWorkerFilter && (
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
                  )}

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
                    {/* <label className="text-sm font-medium flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Date Range</span>
                    </label> */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Date Range</span>
                      </label>
                      <ModernDateRangePicker
                        startDate={dateRange.startDate}
                        endDate={dateRange.endDate}
                        onChange={setDateRange}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Collection Details</CardTitle>
                      <CardDescription>
                        {filteredData.length} transactions found
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Button onClick={generateCSV} variant="outline" className="flex-1 sm:flex-none items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Export CSV</span>
                      </Button>
                      <Button onClick={generateExcel} className="flex-1 sm:flex-none items-center space-x-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Export Excel</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Date</TableHead>
                              <TableHead className="whitespace-nowrap">Retailer Code</TableHead>
                              <TableHead className="whitespace-nowrap">Line Worker</TableHead>
                              {/* <TableHead className="whitespace-nowrap">Assigned Areas</TableHead> */}
                              <TableHead className="whitespace-nowrap">Retailer</TableHead>
                              <TableHead className="whitespace-nowrap">Retailer Area</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                              <TableHead className="whitespace-nowrap">Method</TableHead>
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
                                  <TableCell>{item.retailerCode}</TableCell>
                                  <TableCell className="font-medium">{item.lineWorkerName}</TableCell>
                                  {/* <TableCell className="text-sm text-gray-600">{item.lineWorkerArea}</TableCell> */}
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
                    </div>

                    {/* Tablet View */}
                    <div className="hidden md:block lg:hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Date</TableHead>
                              <TableHead className="whitespace-nowrap">Line Worker</TableHead>
                              <TableHead className="whitespace-nowrap">Retailer</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                              <TableHead className="whitespace-nowrap">Method</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                  No collections found for the selected criteria
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredData.map((item, index) => (
                                <TableRow key={`${item.paymentId}-${index}`}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{formatTimestamp(item.date)}</div>
                                      <div className="text-xs text-gray-500">{item.time}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">{item.lineWorkerName}</TableCell>
                                  <TableCell className="font-medium">{item.retailerName}</TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">{item.paymentMethod}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-3">
                      {filteredData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No collections found for the selected criteria
                        </div>
                      ) : (
                        filteredData.map((item, index) => (
                          <Card key={`${item.paymentId}-${index}`} className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-lg">{formatCurrency(item.amount)}</div>
                                  <div className="text-sm text-gray-600">{item.paymentMethod}</div>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                  <div>{formatTimestamp(item.date)}</div>
                                  <div>{item.time}</div>
                                </div>
                              </div>

                              <div className="border-t pt-2 space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium">Line Worker:</span>
                                  <span className="text-sm">{item.lineWorkerName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium">Retailer:</span>
                                  <span className="text-sm">{item.retailerName}</span>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                  {/* <div><strong>Worker Areas:</strong> {item.lineWorkerArea}</div> */}
                                  <div><strong>Retailer Area:</strong> {item.retailerArea}</div>
                                  {item.retailerAddress && (
                                    <div><strong>Address:</strong> {item.retailerAddress}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Footer Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <strong>Summary:</strong> {totalCollections} collections totaling {formatCurrency(totalAmount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Generated on {formatTimestampWithTime(new Date())}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}