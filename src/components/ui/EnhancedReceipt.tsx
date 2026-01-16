'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, X, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { LOGO_BASE64 } from '@/constants/assets';

// ... (Interfaces remain the same)
interface Payment {
  id: string;
  totalPaid: number;
  method: string;
  createdAt: any;
  lineWorkerId: string;
  lineWorkerName?: string;
  tenantId?: string;
  tenantIds?: string[];
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
  const receiptRef = useRef<HTMLDivElement>(null);

  // Helper functions to get retailer information
  const getRetailerName = (retailer: Retailer | null) => retailer?.profile?.realName || retailer?.name || 'Unknown Retailer';
  const getRetailerPhone = (retailer: Retailer | null) => retailer?.profile?.phone || retailer?.phone;
  const getRetailerAddress = (retailer: Retailer | null) => retailer?.profile?.address || retailer?.address;

  const wholesalerName =
    (tenantId === 'all'
      ? (wholesalerNames[payment.tenantId || ''] || 'Unknown Wholesaler')
      : (wholesalerNames[tenantId || ''] || 'Unknown Wholesaler')
    );

  const lineWorkerName = payment.lineWorkerName || lineWorkerNames[payment.lineWorkerId] || 'Unknown Line Worker';

  // Robust generation function that clones the element to avoid scroll/viewport issues
  const generateReceiptCanvas = async () => {
    if (!receiptRef.current) throw new Error('Receipt element not found');

    const originalElement = receiptRef.current;

    // 1. Clone the element
    const clone = originalElement.cloneNode(true) as HTMLElement;

    // 2. Style the clone for capture (A4 proportions, off-screen)
    clone.style.position = 'fixed';
    clone.style.top = '0';
    clone.style.left = '0'; // Use 0,0 but z-index -1000 to avoid viewport/scroll issues sometimes caused by large negative values
    clone.style.width = '800px';
    clone.style.height = 'auto'; // Let height adapt
    clone.style.zIndex = '-1000';
    clone.style.backgroundColor = '#ffffff';
    clone.style.padding = '40px'; // Add consistent padding for the PDF itself
    clone.style.boxSizing = 'border-box';

    // Hide the border in the PDF version if desired, or keep it. 
    // Usually a clean PDF doesn't need the dashboard-style border wrapper, 
    // but we'll keep the inner logic.

    // Remove any shadow or border from the clone container if needed, 
    // but since we clone the inner receiptRef (which includes the border div), it's fine.

    // Append to body
    document.body.appendChild(clone);

    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased timeout slightly

    try {
      const canvas = await html2canvas(clone, {
        scale: 2, // Retina
        useCORS: true,
        allowTaint: true, // Allow tainted images (like base64 or legit external)
        logging: false,
        backgroundColor: '#ffffff',
        width: 800,
        windowWidth: 800
      });
      return canvas;
    } finally {
      // Clean up
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateReceiptCanvas();
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      pdf.save(`receipt-${payment.id}-${timestamp}.pdf`);
    } catch (error: any) {
      console.error('PDF Generation failed:', error);
      alert(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareReceipt = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateReceiptCanvas();
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const pdfBlob = pdf.output('blob');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const file = new File([pdfBlob], `receipt-${payment.id}-${timestamp}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Payment Receipt',
          text: `Receipt for ${formatCurrency(payment.totalPaid)}`,
          files: [file]
        });
      } else {
        // Fallback to download if web share is invalid
        // But throwing here allows the catch block to handle mixed fallback
        downloadPDF();
      }
    } catch (error: any) {
      console.error('Share failed:', error);
      // Only alert if it's not a user cancellation (which often has no message or 'AbortError')
      if (error.name !== 'AbortError') {
        alert('Sharing failed on this device. Downloading file instead...');
        downloadPDF();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {/* Sticky Header */}
        <div className="flex-shrink-0 px-4 py-4 sm:px-6 bg-white border-b border-gray-200 flex items-center justify-between z-10 w-full">
          <DialogTitle className="text-lg font-bold">Payment Receipt</DialogTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={shareReceipt}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Share className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              size="sm"
              onClick={downloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            {/* Custom Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-2 h-8 w-8 rounded-full md:hidden" // Show icon close on mobile only if needed, or always?
            // Actually, standard X is nice. Let's make it consistent.
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-2 h-8 w-8 rounded-full hidden md:flex"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div className="max-w-xl mx-auto bg-white shadow-sm border border-gray-200 rounded-lg" ref={receiptRef}>
            {/* Inner Content Padding */}
            <div className="p-6 sm:p-8">

              {/* Receipt Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
                <div className="flex items-center justify-center mb-3">
                  {/* Using Base64 Logo - Critical for offline/canvas */}
                  <img
                    src={LOGO_BASE64}
                    alt="PharmaLync"
                    className="h-14 w-14 mr-3 object-contain"
                  />
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">PharmaLync</h1>
                </div>
                <p className="text-sm text-gray-600 font-medium tracking-wide uppercase">Verify. Collect. Track.</p>
                <div className="mt-3 inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
                  OFFICIAL RECEIPT
                </div>
              </div>

              {/* Receipt Info Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Receipt ID</span>
                  <p className="text-gray-900 font-mono text-sm break-all font-medium">{payment.id}</p>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date & Time</span>
                  <p className="text-gray-900 font-medium">{formatTimestampWithTime(payment.createdAt)}</p>
                </div>
              </div>

              {/* Main Details Section */}
              <div className="space-y-6 mb-8">
                {/* Payment Info */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">PAYMENT DETAILS</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Amount Paid</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(payment.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium text-gray-900">{payment.method}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Collected By</span>
                      <span className="font-medium text-gray-900">{lineWorkerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Wholesaler</span>
                      <span className="font-medium text-gray-900">{wholesalerName}</span>
                    </div>
                  </div>
                </div>

                {/* Retailer Info */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">RETAILER DETAILS</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-600">Name</span>
                      <span className="font-medium text-gray-900 text-right">{getRetailerName(retailer)}</span>
                    </div>
                    {getRetailerPhone(retailer) && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-gray-600">Phone</span>
                        <span className="font-medium text-gray-900 text-right">{getRetailerPhone(retailer)}</span>
                      </div>
                    )}
                    {getRetailerAddress(retailer) && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-gray-600">Address</span>
                        <span className="font-medium text-gray-900 text-right max-w-[180px] break-words">{getRetailerAddress(retailer)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t-2 border-dashed border-gray-200">
                <p className="text-sm font-medium text-gray-800 mb-1">Thank you for your business!</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Computer Generated Receipt</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}