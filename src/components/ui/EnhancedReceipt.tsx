'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, X, FileText } from 'lucide-react';
import { formatTimestampWithTime, formatCurrency } from '@/lib/timestamp-utils';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { pdf } from '@react-pdf/renderer';
import { PaymentReceiptPDF } from '@/components/receipts/PaymentReceiptPDF';
import { saveAs } from 'file-saver';
import { LOGO_BASE64 } from '@/constants/assets';

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
      // Try tenantId first, then tenantIds[0] as fallback
      let actualTenantId = payment.tenantId || payment.tenantIds?.[0];

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

  const wholesalerAddress = tenantInfo?.address;

  const lineWorkerName = payment.lineWorkerName || lineWorkerNames[payment.lineWorkerId] || 'Unknown Line Worker';

  // Helper to generate basic blob
  const generatePdfBlob = async () => {
    return await pdf(
      <PaymentReceiptPDF
        payment={payment}
        retailer={retailer}
        wholesalerName={wholesalerName}
        wholesalerAddress={wholesalerAddress}
        lineWorkerName={lineWorkerName}
      />
    ).toBlob();
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      console.log('Starting PDF generation with @react-pdf/renderer...');

      const blob = await generatePdfBlob();

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `receipt-${payment.id}-${timestamp}.pdf`;

      saveAs(blob, filename);
      console.log('PDF downloaded successfully');

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

      const blob = await generatePdfBlob();

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `receipt-${payment.id}-${timestamp}.pdf`;

      const pdfFile = new File([blob], filename, { type: 'application/pdf' });

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
          console.log('Share failed/cancelled:', shareError);
          // Don't fallback automatically on user cancel, only on error if needed
        }
      } else {
        console.log('Web Share API not available, falling back to download');
        saveAs(blob, filename);
        // Optionally notify user
        // alert('Sharing is not supported on this device/browser. The file has been downloaded instead.');
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

        {/* Receipt Content Visualization (HTML version for preview) */}
        <div id="receipt-content" className="bg-white p-8 border border-gray-200 rounded-lg">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
            <div className="flex items-center justify-center mb-2">
              <img
                src={LOGO_BASE64}
                alt="PharmaLync"
                className="h-12 w-12 mr-3"
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
              {wholesalerAddress && (
                <div className="py-2">
                  <span className="text-gray-600">Wholesaler Address:</span>
                  <p className="font-medium mt-1">{wholesalerAddress}</p>
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