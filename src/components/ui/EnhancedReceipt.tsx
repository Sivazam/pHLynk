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
    // Create a comprehensive style override to replace all oklch and other problematic CSS
    const style = document.createElement('style');
    style.id = 'receipt-pdf-fix';
    style.textContent = `
      /* Reset all colors and backgrounds to safe RGB values */
      #receipt-content,
      #receipt-content * {
        color: rgb(17, 24, 39) !important;
        background-color: rgb(255, 255, 255) !important;
        border-color: rgb(229, 231, 235) !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      
      /* Explicit RGB color overrides */
      #receipt-content .text-gray-900,
      #receipt-content .text-gray-900 * { color: rgb(17, 24, 39) !important; }
      #receipt-content .text-gray-800,
      #receipt-content .text-gray-800 * { color: rgb(31, 41, 55) !important; }
      #receipt-content .text-gray-700,
      #receipt-content .text-gray-700 * { color: rgb(55, 65, 81) !important; }
      #receipt-content .text-gray-600,
      #receipt-content .text-gray-600 * { color: rgb(75, 85, 99) !important; }
      #receipt-content .text-gray-500,
      #receipt-content .text-gray-500 * { color: rgb(107, 114, 128) !important; }
      #receipt-content .text-gray-400,
      #receipt-content .text-gray-400 * { color: rgb(156, 163, 175) !important; }
      #receipt-content .text-green-600,
      #receipt-content .text-green-600 * { color: rgb(22, 163, 74) !important; }
      #receipt-content .text-blue-600,
      #receipt-content .text-blue-600 * { color: rgb(37, 99, 235) !important; }
      
      /* Background color overrides */
      #receipt-content .bg-white,
      #receipt-content .bg-white * { background-color: rgb(255, 255, 255) !important; }
      #receipt-content .bg-gray-50,
      #receipt-content .bg-gray-50 * { background-color: rgb(249, 250, 251) !important; }
      #receipt-content .bg-blue-600,
      #receipt-content .bg-blue-600 * { background-color: rgb(37, 99, 235) !important; }
      
      /* Border color overrides */
      #receipt-content .border-gray-200,
      #receipt-content .border-gray-200 * { border-color: rgb(229, 231, 235) !important; }
      #receipt-content .border-gray-300,
      #receipt-content .border-gray-300 * { border-color: rgb(209, 213, 219) !important; }
      #receipt-content .border-gray-800,
      #receipt-content .border-gray-800 * { border-color: rgb(31, 41, 55) !important; }
      #receipt-content .border-b,
      #receipt-content .border-b * { border-bottom-color: rgb(229, 231, 235) !important; }
      #receipt-content .border-t,
      #receipt-content .border-t * { border-top-color: rgb(229, 231, 235) !important; }
      
      /* Force inline styles for critical elements */
      #receipt-content h1,
      #receipt-content h2,
      #receipt-content .text-2xl,
      #receipt-content .text-lg,
      #receipt-content .text-xl {
        color: rgb(17, 24, 39) !important;
        font-weight: bold !important;
      }
      
      #receipt-content .text-green-600 {
        color: rgb(22, 163, 74) !important;
        font-weight: bold !important;
      }
      
      #receipt-content .text-sm,
      #receipt-content .text-xs {
        color: rgb(75, 85, 99) !important;
      }
      
      /* Override any CSS variables */
      #receipt-content {
        --tw-text-opacity: 1 !important;
        --tw-bg-opacity: 1 !important;
        --tw-border-opacity: 1 !important;
      }
    `;
    
    // Apply the style to the document
    document.head.appendChild(style);
    
    // Also apply inline styles directly to the element for maximum compatibility
    const originalStyles = new Map();
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      const element = el as HTMLElement;
      originalStyles.set(element, {
        color: element.style.color,
        backgroundColor: element.style.backgroundColor,
        borderColor: element.style.borderColor
      });
      
      // Force RGB colors
      element.style.color = 'rgb(17, 24, 39)';
      element.style.backgroundColor = 'rgb(255, 255, 255)';
      element.style.borderColor = 'rgb(229, 231, 235)';
    });

    try {
      // Wait a bit for styles to apply
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Apply the same style overrides to the cloned document
          const clonedStyle = clonedDoc.createElement('style');
          clonedStyle.textContent = style.textContent;
          clonedDoc.head.appendChild(clonedStyle);

          // Apply inline styles to cloned elements as well
          const clonedElements = clonedDoc.querySelectorAll('#receipt-content *');
          clonedElements.forEach(el => {
            const element = el as HTMLElement;
            element.style.color = 'rgb(17, 24, 39)';
            element.style.backgroundColor = 'rgb(255, 255, 255)';
            element.style.borderColor = 'rgb(229, 231, 235)';
          });

          // Ensure images are loaded in the cloned document
          const images = clonedDoc.querySelectorAll('img');
          const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => {
                // Replace broken images with fallback
                const fallback = clonedDoc.createElement('div');
                fallback.className = 'h-12 w-12 mr-3 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl';
                fallback.textContent = 'P';
                fallback.style.backgroundColor = 'rgb(37, 99, 235)';
                fallback.style.color = 'rgb(255, 255, 255)';
                fallback.style.display = 'flex';
                fallback.style.alignItems = 'center';
                fallback.style.justifyContent = 'center';
                img.parentNode?.replaceChild(fallback, img);
                resolve({});
              };
              setTimeout(reject, 5000);
            });
          });
          return Promise.all(promises);
        }
      });

      // Restore original styles
      allElements.forEach(el => {
        const element = el as HTMLElement;
        const original = originalStyles.get(element);
        if (original) {
          element.style.color = original.color;
          element.style.backgroundColor = original.backgroundColor;
          element.style.borderColor = original.borderColor;
        }
      });

      // Remove the temporary style
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      
      return canvas;
    } catch (error) {
      // Restore original styles in case of error
      allElements.forEach(el => {
        const element = el as HTMLElement;
        const original = originalStyles.get(element);
        if (original) {
          element.style.color = original.color;
          element.style.backgroundColor = original.backgroundColor;
          element.style.borderColor = original.borderColor;
        }
      });
      
      // Make sure to remove the style even if an error occurs
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      throw error;
    }
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('receipt-content');
      if (!element) {
        throw new Error('Receipt content element not found');
      }

      console.log('Starting PDF generation...');
      
      // Wait a bit for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await generateCanvas(element);

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
      pdf.save(`receipt-${payment.id}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('oklch') || errorMessage.includes('color')) {
        alert('Failed to generate PDF due to a color rendering issue. Please try again or contact support if the issue persists.');
      } else {
        alert(`Failed to generate PDF: ${errorMessage}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const shareReceipt = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('receipt-content');
      if (!element) {
        throw new Error('Receipt content element not found');
      }

      console.log('Starting share PDF generation...');
      
      // Wait a bit for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await generateCanvas(element);

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
      const pdfFile = new File([pdfBlob], `receipt-${payment.id}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          console.log('Attempting to share via Web Share API...');
          await navigator.share({
            title: 'PharmaLync Payment Receipt',
            text: `Payment receipt for ${formatCurrency(payment.totalPaid)} from ${retailer?.name || 'Unknown Retailer'}`,
            files: [pdfFile]
          });
          console.log('Share successful');
        } catch (shareError) {
          console.log('Share failed, falling back to download:', shareError);
          // Fallback to download if share fails
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${payment.id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        console.log('Web Share API not available, falling back to download');
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
      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('oklch') || errorMessage.includes('color')) {
        alert('Failed to share receipt due to a color rendering issue. Please try again or contact support if the issue persists.');
      } else {
        alert(`Failed to share receipt: ${errorMessage}. Please try again.`);
      }
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