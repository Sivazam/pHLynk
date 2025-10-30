'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Confetti } from '@/components/ui/Confetti';
import { Retailer } from '@/types';
import { formatCurrency } from '@/lib/timestamp-utils';
import { 
  CreditCard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PaymentForm {
  retailerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  notes?: string;
}

interface CollectPaymentFormProps {
  retailers: Retailer[];
  preSelectedRetailer?: Retailer | null;
  onCollectPayment: (formData: PaymentForm) => Promise<void>;
  onCancel: () => void;
  collectingPayment: boolean;
}

const CollectPaymentFormComponent = ({ 
  retailers, 
  preSelectedRetailer,
  onCollectPayment, 
  onCancel, 
  collectingPayment 
}: CollectPaymentFormProps) => {
  const onCollectRef = useRef(onCollectPayment);
  
  // Success and confetti state
  const [showSuccess, setShowSuccess] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update refs when props change
  useEffect(() => {
    onCollectRef.current = onCollectPayment;
  }, [onCollectPayment]);

  // Update form when preSelectedRetailer changes
  useEffect(() => {
    if (preSelectedRetailer) {
      setFormData(prev => ({
        ...prev,
        retailerId: preSelectedRetailer.id
      }));
    }
  }, [preSelectedRetailer]);

  // Optimized state management
  const [formData, setFormData] = useState<PaymentForm>(() => ({
    retailerId: preSelectedRetailer?.id || '',
    amount: 0,
    paymentMethod: 'CASH',
    notes: ''
  }));

  // Optimized update functions
  const updateField = useCallback((field: keyof PaymentForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (error) setError(null);
  }, [error]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.retailerId) {
      setError('Please select a retailer');
      return;
    }
    
    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    
    try {
      setError(null);
      console.log('🚀 Initiating payment collection...', formData);
      
      // Show immediate feedback that we're processing
      console.log('📤 Creating payment record...');
      await onCollectRef.current(formData);
      
      // Show success state and trigger confetti
      setShowSuccess(true);
      setTriggerConfetti(true);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          retailerId: preSelectedRetailer?.id || '',
          amount: 0,
          paymentMethod: 'CASH',
          notes: ''
        });
        setShowSuccess(false);
        onCancel();
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error collecting payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to collect payment. Please try again.';
      setError(errorMessage);
      
      // Keep form open for user to retry
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  }, [formData.retailerId, formData.amount, onCancel, preSelectedRetailer?.id]);

  const handleConfettiComplete = () => {
    setTriggerConfetti(false);
  };

  // Get selected retailer info
  const selectedRetailer = useMemo(() => {
    return retailers.find(r => r.id === formData.retailerId);
  }, [retailers, formData.retailerId]);

  // Memoized retailer options
  const retailerOptions = useMemo(() => {
    return retailers.map((retailer) => (
      <SelectItem key={retailer.id} value={retailer.id}>
        {retailer.profile ? retailer.profile.realName : retailer.name}
      </SelectItem>
    ));
  }, [retailers]);

  return (
    <>
      <Confetti trigger={triggerConfetti} onComplete={handleConfettiComplete} />
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
        {showSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">Payment Initiated Successfully!</h3>
            <p className="text-gray-600">OTP has been generated and sent to the retailer for verification.</p>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="space-y-2 pb-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Collect Payment</h2>
              <p className="text-sm text-gray-600">Enter payment details to initiate collection from retailer</p>
            </div>

            {/* Error Display */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Payment Information - Mobile First Grid */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-1">Payment Information</h3>
              
              {/* Grid Layout for Mobile First */}
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                
                {/* Row 1: Retailer Selection - Full width on mobile */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Retailer *</Label>
                  <Select 
                    value={formData.retailerId} 
                    onValueChange={(value) => updateField('retailerId', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select retailer" />
                    </SelectTrigger>
                    <SelectContent>
                      {retailerOptions}
                    </SelectContent>
                  </Select>
                  {selectedRetailer && (
                    <p className="text-xs text-gray-500">
                      {selectedRetailer.profile?.address && `Address: ${selectedRetailer.profile.address}`}
                      {selectedRetailer.profile?.phone && ` • Phone: ${selectedRetailer.profile.phone}`}
                    </p>
                  )}
                </div>

                {/* Row 2: Amount and Payment Method - Side by side on larger screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Amount *</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-sm font-medium text-gray-400">₹</span>
                      </div>
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={formData.amount ? formData.amount.toString() : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numbers and decimal point
                          if (/^\d*\.?\d*$/.test(value) || value === '') {
                            const numValue = parseFloat(value) || 0;
                            updateField('amount', numValue);
                          }
                        }}
                        className="h-10 pl-9"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Enter amount</p>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Payment Method *</Label>
                    <Select 
                      value={formData.paymentMethod} 
                      onValueChange={(value) => updateField('paymentMethod', value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Select method</p>
                  </div>
                </div>

                {/* Row 3: Notes - Full width */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Notes (Optional)</Label>
                  <Input
                    placeholder="Add any notes about this payment..."
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">Optional notes for reference</p>
                </div>
              </div>
            </div>

            {/* Payment Summary - Responsive Card */}
            {formData.amount > 0 && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-900">Payment Summary</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="flex justify-between sm:flex-col sm:space-y-1">
                    <span className="text-xs sm:text-sm text-blue-600">Retailer:</span>
                    <span className="text-sm sm:font-medium text-blue-900 truncate">
                      {selectedRetailer?.profile?.realName || selectedRetailer?.name || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:space-y-1">
                    <span className="text-xs sm:text-sm text-blue-600">Amount:</span>
                    <span className="text-sm sm:font-medium text-blue-900">{formatCurrency(formData.amount)}</span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:space-y-1">
                    <span className="text-xs sm:text-sm text-blue-600">Method:</span>
                    <span className="text-sm sm:font-medium text-blue-900">{formData.paymentMethod}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Responsive */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={collectingPayment}
                className="h-10 px-4 text-sm w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={collectingPayment || !formData.retailerId || !formData.amount || formData.amount <= 0}
                className="h-10 px-4 text-sm min-w-[120px] w-full sm:w-auto order-1 sm:order-2"
              >
                {collectingPayment ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending OTP...
                  </div>
                ) : (
                  'Collect Payment'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export const CollectPaymentForm = React.memo(CollectPaymentFormComponent);