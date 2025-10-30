'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, X, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

interface Payment {
  id: string;
  totalPaid: number;
  method: string;
  createdAt: any;
  lineWorkerId: string;
  lineWorkerName?: string;
  tenantId?: string;
  retailerName?: string;
  retailerAddress?: string;
  retailerPhone?: string;
  retailerArea?: string;
  evidence?: any[];
}

interface Retailer {
  name?: string;
  phone?: string;
  address?: string;
  areaId?: string;
  profile?: {
    realName?: string;
    phone?: string;
    address?: string;
  };
}

interface WholesalerNames {
  [key: string]: string;
}

interface LineWorkerNames {
  [key: string]: string;
}

interface EnhancedReceiptProps {
  payment: Payment;
  retailer: Retailer | null;
  wholesalerNames: WholesalerNames;
  lineWorkerNames: LineWorkerNames;
  tenantId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedReceipt({
  payment,
  retailer,
  wholesalerNames,
  lineWorkerNames,
  tenantId,
  isOpen,
  onClose
}: EnhancedReceiptProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; address?: string } | null>(null);

  // Helper functions to get retailer information
  const getRetailerName = (retailer: Retailer | null) => {
    if (retailer?.profile?.realName) {
      return retailer.profile.realName;
    }
    return retailer?.name || 'Unknown Retailer';
  };

  const getRetailerPhone = (retailer: Retailer | null) => {
    if (retailer?.profile?.phone) {
      return retailer.profile.phone;
    }
    return retailer?.phone;
  };

  const getRetailerAddress = (retailer: Retailer | null) => {
    if (retailer?.profile?.address) {
      return retailer.profile.address;
    }
    return retailer?.address;
  };

  useEffect(() => {
    const fetchTenantInfo = async () => {
      let actualTenantId = payment.tenantId;
      
      // If no tenantId in payment, try to get it from lineWorkerId
      if (!actualTenantId && payment.lineWorkerId) {
        try {
          const db = getFirestore();
          const lineWorkerDoc = await getDoc(doc(db, 'users', payment.lineWorkerId));
          if (lineWorkerDoc.exists()) {
            const lineWorkerData = lineWorkerDoc.data();
            actualTenantId = lineWorkerData?.tenantId || '';
            console.log('📋 Receipt: Fetched tenantId from lineWorker:', actualTenantId);
          }
        } catch (error) {
          console.error('Error fetching tenantId from lineWorker:', error);
        }
      }
      
      if (actualTenantId && actualTenantId !== 'all') {
        try {
          const db = getFirestore();
          const tenantDoc = await getDoc(doc(db, 'tenants', actualTenantId));
          if (tenantDoc.exists()) {
            const tenantData = tenantDoc.data();
            setTenantInfo({
              name: tenantData.name || 'Unknown Wholesaler',
              address: tenantData.address || undefined
            });
            console.log('📋 Receipt: Fetched wholesaler name:', tenantData.name);
          }
        } catch (error) {
          console.error('Error fetching tenant info:', error);
        }
      }
    };

    fetchTenantInfo();
  }, [payment.tenantId, payment.lineWorkerId]);

  const wholesalerName = tenantInfo?.name || 
    (tenantId === 'all' 
      ? (wholesalerNames[payment.tenantId || ''] || 'Unknown Wholesaler')
      : (wholesalerNames[tenantId || ''] || 'Unknown Wholesaler')
    );
  
  const lineWorkerName = payment.lineWorkerName || lineWorkerNames[payment.lineWorkerId] || 'Unknown Line Worker';

  const generateCanvas = async (element: HTMLElement) => {
    try {
      console.log('Starting canvas generation with simplified approach...');
      
      // Create a clean, simple receipt container for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background: white;
        padding: 40px;
        font-family: Arial, sans-serif;
        color: #000000;
        line-height: 1.4;
      `;
      
      // Build a clean HTML structure for PDF
      const paymentDate = formatTimestampWithTime(payment.createdAt);
      const receiptHtml = `
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #000;">PharmaLync</h1>
          <p style="margin: 5px 0; font-size: 14px; color: #666;">Verify. Collect. Track.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">Payment Receipt</p>
        </div>
        
        <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px;">
            <div>
              <strong style="color: #333;">Receipt ID:</strong><br>
              <span style="font-family: monospace; font-size: 11px; color: #000;">${payment.id}</span>
            </div>
            <div>
              <strong style="color: #333;">Date & Time:</strong><br>
              <span style="color: #000;">${paymentDate}</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #000; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
            Payment Details
          </h2>
          <div style="font-size: 14px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666;">Amount Paid:</span>
              <span style="font-weight: bold; font-size: 16px; color: #22c55e;">${formatCurrency(payment.totalPaid)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666;">Payment Method:</span>
              <span style="color: #000;">${payment.method}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666;">Line Worker:</span>
              <span style="color: #000;">${lineWorkerName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #666;">Wholesaler:</span>
              <span style="color: #000;">${wholesalerName}</span>
            </div>
            ${tenantInfo?.address ? `
              <div style="padding: 8px 0;">
                <span style="color: #666;">Wholesaler Address:</span><br>
                <span style="color: #000;">${tenantInfo.address}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #000; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
            Retailer Information
          </h2>
          <div style="font-size: 14px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666;">Name:</span>
              <span style="color: #000;">${getRetailerName(retailer)}</span>
            </div>
            ${getRetailerPhone(retailer) ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span style="color: #666;">Phone:</span>
                <span style="color: #000;">${getRetailerPhone(retailer)}</span>
              </div>
            ` : ''}
            ${getRetailerAddress(retailer) ? `
              <div style="padding: 8px 0;">
                <span style="color: #666;">Address:</span><br>
                <span style="color: #000;">${getRetailerAddress(retailer)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #000; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Thank you for your payment!</p>
          <p style="margin: 0; font-size: 11px; color: #888;">This is a computer-generated receipt and does not require a signature.</p>
          <div style="margin-top: 15px; font-size: 10px; color: #aaa;">
            Powered by PharmaLync - Your Trusted Pharmacy Management System
          </div>
        </div>
      `;
      
      pdfContainer.innerHTML = receiptHtml;
      document.body.appendChild(pdfContainer);
      
      // Wait for the content to render
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate canvas from our clean container
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false,
        width: 800,
        height: pdfContainer.scrollHeight
      });
      
      // Clean up
      document.body.removeChild(pdfContainer);
      
      console.log('Canvas generated successfully with simplified approach');
      return canvas;
      
    } catch (error) {
      console.error('Error in simplified canvas generation:', error);
      throw new Error('Failed to generate receipt image. Please try again.');
    }
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      console.log('Starting PDF generation...');
      
      // Wait a bit for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await generateCanvas(document.getElementById('receipt-content')!);

      console.log('Canvas generated successfully');

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      console.log('PDF generated successfully, saving...');
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `receipt-${payment.id}-${timestamp}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again or contact support if the issue persists.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareReceipt = async () => {
    setIsGenerating(true);
    try {
      console.log('Starting share PDF generation...');
      
      // Wait a bit for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await generateCanvas(document.getElementById('receipt-content')!);

      console.log('Share canvas generated successfully');

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      console.log('Share PDF generated successfully, creating blob...');
      const pdfBlob = pdf.output('blob');
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `receipt-${payment.id}-${timestamp}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          console.log('Attempting to share via Web Share API...');
          await navigator.share({
            title: 'PharmaLync Payment Receipt',
            text: `Payment receipt for ${formatCurrency(payment.totalPaid)} from ${getRetailerName(retailer)}`,
            files: [pdfFile]
          });
          console.log('Share successful');
        } catch (shareError) {
          console.log('Share failed, falling back to download:', shareError);
          // Fallback to download if share fails
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        console.log('Web Share API not available, falling back to download');
        // Fallback to download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      alert('Failed to share receipt. Please try again or contact support if the issue persists.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Payment Receipt</DialogTitle>
        </DialogHeader>

        {/* Receipt Content */}
        <div id="receipt-content" className="bg-white p-8 border border-gray-200 rounded-lg">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
            <div className="flex items-center justify-center mb-2">
              <img 
                src="/logoMain.png" 
                alt="PharmaLync" 
                className="h-12 w-12 mr-3"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'h-12 w-12 mr-3 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl';
                  fallback.textContent = 'P';
                  target.parentNode?.insertBefore(fallback, target);
                }}
              />
              <h1 className="text-2xl font-bold text-gray-900">PharmaLync</h1>
            </div>
            <p className="text-sm text-gray-600">Verify. Collect. Track.</p>
            <div className="mt-2 text-xs text-gray-500">
              Payment Receipt
            </div>
          </div>

          {/* Receipt Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Receipt ID:</span>
                <p className="text-gray-900 font-mono text-xs break-all">{payment.id}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Date & Time:</span>
                <p className="text-gray-900">{formatTimestampWithTime(payment.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-300">
              Payment Details
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-bold text-lg text-green-600">{formatCurrency(payment.totalPaid)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">{payment.method}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Line Worker:</span>
                <span className="font-medium">{lineWorkerName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Wholesaler:</span>
                <span className="font-medium">{wholesalerName}</span>
              </div>
              {tenantInfo?.address && (
                <div className="py-2">
                  <span className="text-gray-600">Wholesaler Address:</span>
                  <p className="font-medium mt-1">{tenantInfo.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Retailer Information */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-300">
              Retailer Information
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{getRetailerName(retailer)}</span>
              </div>
              {getRetailerPhone(retailer) && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{getRetailerPhone(retailer)}</span>
                </div>
              )}
              {getRetailerAddress(retailer) && (
                <div className="py-2">
                  <span className="text-gray-600">Address:</span>
                  <p className="font-medium mt-1">{getRetailerAddress(retailer)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-gray-800 text-center">
            <p className="text-sm text-gray-600 mb-2">Thank you for your payment!</p>
            <p className="text-xs text-gray-500">This is a computer-generated receipt and does not require a signature.</p>
            <div className="mt-4 text-xs text-gray-400">
              Powered by PharmaLync - Your Trusted Pharmacy Management System
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={shareReceipt}
            disabled={isGenerating}
            className="flex items-center space-x-2"
          >
            <Share className="h-4 w-4" />
            <span>{isGenerating ? 'Generating...' : 'Share'}</span>
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={isGenerating}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}