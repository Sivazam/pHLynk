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

  useEffect(() => {
    const fetchTenantInfo = async () => {
      if (payment.tenantId && payment.tenantId !== 'all') {
        try {
          const db = getFirestore();
          const tenantDoc = await getDoc(doc(db, 'tenants', payment.tenantId));
          if (tenantDoc.exists()) {
            const tenantData = tenantDoc.data();
            setTenantInfo({
              name: tenantData.name || 'Unknown Wholesaler',
              address: tenantData.address || undefined
            });
          }
        } catch (error) {
          console.error('Error fetching tenant info:', error);
        }
      }
    };

    fetchTenantInfo();
  }, [payment.tenantId]);

  const wholesalerName = tenantInfo?.name || 
    (tenantId === 'all' 
      ? (wholesalerNames[payment.tenantId || ''] || 'Unknown Wholesaler')
      : (wholesalerNames[tenantId || ''] || 'Unknown Wholesaler')
    );
  
  const lineWorkerName = payment.lineWorkerName || lineWorkerNames[payment.lineWorkerId] || 'Unknown Line Worker';

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('receipt-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
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

      pdf.save(`receipt-${payment.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareReceipt = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('receipt-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
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

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `receipt-${payment.id}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: 'PharmaLync Payment Receipt',
            text: `Payment receipt for ${formatCurrency(payment.totalPaid)} from ${retailer?.name || 'Unknown Retailer'}`,
            files: [pdfFile]
          });
        } catch (error) {
          // Fallback to download if share fails
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${payment.id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Fallback to download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${payment.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      alert('Failed to share receipt. Please try again.');
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
                <span className="font-medium">{retailer?.name || 'Unknown'}</span>
              </div>
              {retailer?.phone && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{retailer.phone}</span>
                </div>
              )}
              {retailer?.address && (
                <div className="py-2">
                  <span className="text-gray-600">Address:</span>
                  <p className="font-medium mt-1">{retailer.address}</p>
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