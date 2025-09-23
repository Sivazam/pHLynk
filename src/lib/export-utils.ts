/**
 * Utility functions for exporting data
 */

export interface ExportData {
  headers: string[];
  rows: string[][];
  filename: string;
}

/**
 * Convert data to CSV format and download it
 */
export const exportToCSV = (data: ExportData) => {
  const { headers, rows, filename } = data;
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => 
        // Escape commas and quotes in cell content
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    )
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Convert data to JSON format and download it
 */
export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Format date for export
 */
export const formatDateForExport = (date: Date | any): string => {
  if (!date) return '';
  
  // Handle Firestore Timestamp
  if (date.toDate) {
    return date.toDate().toISOString().split('T')[0];
  }
  
  // Handle regular Date
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  
  // Handle string date
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Format currency for export
 */
export const formatCurrencyForExport = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Prepare payment data for export
 */
export const preparePaymentDataForExport = (payments: any[], retailers: any[], lineWorkers: any[]) => {
  return payments.map(payment => {
    const retailer = retailers.find(r => r.id === payment.retailerId);
    const lineWorker = lineWorkers.find(lw => lw.uid === payment.lineWorkerId);
    
    return [
      payment.id,
      formatDateForExport(payment.createdAt),
      retailer?.name || 'Unknown',
      lineWorker?.name || lineWorker?.email || 'Unknown',
      formatCurrencyForExport(payment.totalPaid),
      payment.method,
      payment.state,
      payment.timeline?.completedAt ? formatDateForExport(payment.timeline.completedAt) : '',
      payment.timeline?.otpVerifiedAt ? formatDateForExport(payment.timeline.otpVerifiedAt) : ''
    ];
  });
};

/**
 * Prepare retailer data for export
 */
export const prepareRetailerDataForExport = (retailers: any[], areas: any[], lineWorkers: any[]) => {
  return retailers.map(retailer => {
    const area = areas.find(a => a.id === retailer.areaId);
    const assignedLineWorker = lineWorkers.find(lw => lw.uid === retailer.assignedLineWorkerId);
    
    return [
      retailer.id,
      retailer.name,
      retailer.phone,
      retailer.email,
      retailer.address,
      area?.name || 'Unassigned',
      assignedLineWorker?.name || assignedLineWorker?.email || 'Unassigned',
      retailer.active ? 'Active' : 'Inactive',
      formatDateForExport(retailer.createdAt)
    ];
  });
};

/**
 * Prepare line worker data for export
 */
export const prepareLineWorkerDataForExport = (lineWorkers: any[], areas: any[], retailers: any[]) => {
  return lineWorkers.map(worker => {
    const workerAreas = areas.filter(area => worker.assignedAreas?.includes(area.id));
    const workerRetailers = retailers.filter(r => r.assignedLineWorkerId === worker.uid);
    const workerPayments = workerRetailers.flatMap(r => 
      retailers.filter(ret => ret.id === r.id)
    ).map(r => r.payments || []).flat();
    
    const totalCollected = workerPayments
      .filter(p => p.state === 'COMPLETED')
      .reduce((sum, p) => sum + (p.totalPaid || 0), 0);
    
    return [
      worker.uid,
      worker.name,
      worker.email,
      worker.phone,
      workerAreas.map(a => a.name).join('; ') || 'None',
      workerRetailers.length.toString(),
      workerPayments.filter(p => p.state === 'COMPLETED').length.toString(),
      formatCurrencyForExport(totalCollected),
      worker.active ? 'Active' : 'Inactive',
      formatDateForExport(worker.createdAt)
    ];
  });
};