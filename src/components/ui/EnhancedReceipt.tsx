'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, X } from 'lucide-react';
import jsPDF from 'jspdf';
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

  // --- PURE PROGRAMMATIC PDF GENERATION (The Standard Approach) ---
  // drawing everything manually with x,y coords guarantees 100% success independent of CSS
  const generateReceiptPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Header & Logo
    const logoSize = 15;
    const startY = 20;

    // Add Logo (if base64 is valid)
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 15, startY, logoSize, logoSize);
    } catch (e) {
      console.warn('Logo failed to add to PDF', e);
    }

    // Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PharmaLync", 35, startY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Verify. Collect. Track.", 35, startY + 14);

    // "Official Receipt" Badge
    doc.setFillColor(243, 244, 246); // gray-100
    doc.roundedRect(150, startY, 45, 10, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.text("OFFICIAL RECEIPT", 172.5, startY + 6.5, { align: 'center' });

    // 2. Receipt ID & Date Grid
    const gridY = startY + 25;
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setFillColor(249, 250, 251); // gray-50
    doc.rect(15, gridY, 180, 20, 'FD'); // Fill and Draw

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text("RECEIPT ID", 20, gridY + 6);
    doc.text("DATE & TIME", 130, gridY + 6); // visual column

    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39); // gray-900 font-medium
    doc.setFont("helvetica", "bold"); // mimic font-medium
    doc.text(payment.id, 20, gridY + 14);
    doc.text(formatTimestampWithTime(payment.createdAt), 130, gridY + 14);

    // 3. Payment Details
    let cursorY = gridY + 35;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Payment Details", 15, cursorY);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, cursorY + 2, 195, cursorY + 2);
    cursorY += 10;

    // Helper row function
    const addRow = (label: string, value: string, isGreen = false) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // gray-600
      doc.text(label, 15, cursorY);

      doc.setFont("helvetica", "bold");
      if (isGreen) doc.setTextColor(22, 163, 74); // green-600
      else doc.setTextColor(17, 24, 39); // gray-900

      // Right align value
      doc.text(value, 195, cursorY, { align: 'right' });

      cursorY += 8;
    };

    addRow("Amount Paid", formatCurrency(payment.totalPaid), true);
    addRow("Payment Method", payment.method);
    addRow("Collected By", lineWorkerName);
    addRow("Wholesaler", wholesalerName);

    cursorY += 10;

    // 4. Retailer Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Retailer Details", 15, cursorY);
    doc.line(15, cursorY + 2, 195, cursorY + 2);
    cursorY += 10;

    addRow("Name", getRetailerName(retailer));
    if (getRetailerPhone(retailer)) {
      addRow("Phone", getRetailerPhone(retailer)!);
    }
    if (getRetailerAddress(retailer)) {
      // Handle address wrapping
      const address = getRetailerAddress(retailer)!;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.text("Address", 15, cursorY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);

      const splitAddr = doc.splitTextToSize(address, 80); // wrap to 80mm
      doc.text(splitAddr, 195, cursorY, { align: 'right' });

      cursorY += (splitAddr.length * 5) + 5;
    }

    // 5. Footer
    cursorY += 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0); // Dashed line
    doc.line(15, cursorY, 195, cursorY);
    doc.setLineDashPattern([], 0); // Reset

    cursorY += 8;
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text("Thank you for your business!", 105, cursorY, { align: 'center' });

    cursorY += 5;
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("COMPUTER GENERATED RECEIPT", 105, cursorY, { align: 'center' });

    return doc;
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = generateReceiptPDF();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      doc.save(`receipt-${payment.id}-${timestamp}.pdf`);
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
      const doc = generateReceiptPDF();
      const pdfBlob = doc.output('blob');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const file = new File([pdfBlob], `receipt-${payment.id}-${timestamp}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Payment Receipt',
          text: `Receipt for ${formatCurrency(payment.totalPaid)}`,
          files: [file]
        });
      } else {
        // Fallback to download
        doc.save(`receipt-${payment.id}-${timestamp}.pdf`);
      }
    } catch (error: any) {
      console.error('Share failed:', error);
      if (error.name !== 'AbortError') {
        // Fallback to download on known share failures
        try {
          const doc = generateReceiptPDF();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          doc.save(`receipt-${payment.id}-${timestamp}.pdf`);
        } catch (e) {
          alert('Sharing failed and download fallback failed.');
        }
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
            {/* Custom Close Buttons */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-2 h-8 w-8 rounded-full md:hidden"
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

        {/* Scrollable Content (Visual Only) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div className="max-w-xl mx-auto bg-white shadow-sm border border-gray-200 rounded-lg">
            {/* Inner Content Padding */}
            <div className="p-6 sm:p-8">

              {/* Receipt Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
                <div className="flex items-center justify-center mb-3">
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