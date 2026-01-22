'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Retailer } from '@/types';
import { formatCurrency } from '@/lib/timestamp-utils';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Camera,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Check,
  ChevronsUpDown,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface PaymentForm {
  retailerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  utr?: string; // UTR for UPI payments (last 4 digits)
  notes?: string;
  proofImage?: File | null; // Optional payment screenshot
}

interface WholesalerUpiInfo {
  primaryUpiId?: string;
  primaryQrCodeUrl?: string;
}

interface CollectPaymentFormProps {
  retailers: Retailer[];
  preSelectedRetailer?: Retailer | null;
  onCollectPayment: (formData: PaymentForm) => Promise<void>;
  onCancel: () => void;
  collectingPayment: boolean;
  wholesalerUpiInfo?: WholesalerUpiInfo;
}

const CollectPaymentFormComponent = ({
  retailers,
  preSelectedRetailer,
  onCollectPayment,
  onCancel,
  collectingPayment,
  wholesalerUpiInfo
}: CollectPaymentFormProps) => {
  // ✅ Removed success/confetti state - now it's a pure data collection form

  const [formData, setFormData] = useState<PaymentForm>(() => ({
    retailerId: preSelectedRetailer?.id || '',
    amount: 0,
    paymentMethod: 'CASH',
    utr: '',
    notes: '',
    proofImage: null
  }));

  const [error, setError] = useState<string | null>(null);
  const [isUpiDetailsOpen, setIsUpiDetailsOpen] = useState(true); // Default open
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Combobox state
  const [open, setOpen] = useState(false);

  // Update form when preSelectedRetailer changes
  React.useEffect(() => {
    if (preSelectedRetailer) {
      setFormData(prev => ({
        ...prev,
        retailerId: preSelectedRetailer.id
      }));
    }
  }, [preSelectedRetailer]);

  // Optimized update functions
  const updateField = useCallback((field: keyof PaymentForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (error) setError(null);
  }, [error]);

  // Handle file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Update form data
      setFormData(prev => ({ ...prev, proofImage: file }));

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Clear error if any
      if (error) setError(null);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setFormData(prev => ({ ...prev, proofImage: null }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit handler
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.retailerId) {
      setError('Please select a retailer');
      return;
    }

    if (!formData.amount || formData.amount < 1) {
      setError('Please enter a valid amount (minimum ₹1)');
      return;
    }

    // Validate UTR for UPI payments (Compulsory)
    if (formData.paymentMethod === 'UPI') {
      const hasUtr = formData.utr && formData.utr.length === 4;

      if (!hasUtr) {
        setError('For UPI payments, please enter the last 4 digits of UTR');
        return;
      }
    }

    try {
      setError(null);
      console.log('🚀 Submitting payment data...', formData);

      // Call parent callback - parent will handle confirmation and success
      await onCollectPayment(formData);

      // Close form after successful submission
      onCancel();
    } catch (error: any) {
      console.error('❌ Error collecting payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to collect payment. Please try again.';
      setError(errorMessage);

      // Keep form open for user to retry
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  }, [formData.retailerId, formData.amount, formData.paymentMethod, formData.utr, formData.proofImage, onCollectPayment, onCancel]);

  // Get selected retailer info
  const selectedRetailer = useMemo(() => {
    return retailers.find(r => r.id === formData.retailerId);
  }, [retailers, formData.retailerId]);

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
      {/* Header Section */}
      {/* <div className="space-y-2 pb-3 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Collect Payment</h2>
        <p className="text-sm text-gray-600">Enter payment details to initiate collection from retailer</p>
      </div> */}

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
          <div className="space-y-1 flex flex-col">
            <Label className="text-sm font-medium text-gray-700">Retailer *</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between h-10 w-full"
                >
                  {selectedRetailer ? (
                    <div className="flex flex-col items-start truncate overflow-hidden">
                      <span className="truncate w-full text-left font-medium">
                        {selectedRetailer.profile?.realName || selectedRetailer.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500">Search retailer name, code, mobile...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[460px] p-0" align="start">
                <Command
                  filter={(value, search) => {
                    const searchLower = search.toLowerCase();
                    const valueLower = value.toLowerCase();

                    // Strict filtering
                    // 1. If Code or Name STARTS with search term -> High Priority
                    // 2. If Code or Name CONTAINS search term -> Medium Priority
                    // 3. Otherwise -> Filter out (0)

                    // Value format we set: "Name Code ID"
                    // We can try to split or just regex, but simple includes is fine if we want strictness.
                    // The user said "gives all possibilities", implying fuzzy was matching "ap20" to "AP421".
                    // Standard includes() would NOT match "AP421" with "ap20".

                    if (valueLower.includes(searchLower)) return 1;
                    return 0;
                  }}
                >
                  <CommandInput placeholder="Search retailer name or code..." />
                  <CommandList>
                    <CommandEmpty>No retailer found.</CommandEmpty>
                    <CommandGroup>
                      {retailers.map((retailer) => (
                        <CommandItem
                          key={retailer.id}
                          value={`${retailer.profile?.realName || retailer.name} ${retailer.code || ''} ${retailer.id}`}
                          onSelect={() => {
                            updateField('retailerId', retailer.id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 flex-shrink-0",
                              formData.retailerId === retailer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-3 w-full overflow-hidden">
                            {/* Code Badge */}
                            {retailer.code && (
                              <span className="flex-shrink-0 bg-yellow-100 text-yellow-800 text-xs font-mono font-bold px-2 py-0.5 rounded border border-yellow-200">
                                {retailer.code}
                              </span>
                            )}
                            {/* Name */}
                            <span className="font-medium truncate text-gray-900">
                              {retailer.profile?.realName || retailer.name}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedRetailer && (
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600">
                {selectedRetailer.profile?.address && (
                  <div className="mb-1">📍 {selectedRetailer.profile.address}</div>
                )}
                <div className="flex gap-3">
                  {selectedRetailer.code && <span>🆔 {selectedRetailer.code}</span>}
                  {(selectedRetailer.profile?.phone || selectedRetailer.phone) && (
                    <span>📞 {selectedRetailer.profile?.phone || selectedRetailer.phone}</span>
                  )}
                </div>
              </div>
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

            {/* UPI Payment Details - Collapsible */}
            {formData.paymentMethod === 'UPI' && wholesalerUpiInfo && (wholesalerUpiInfo.primaryUpiId || wholesalerUpiInfo.primaryQrCodeUrl) && (
              <div className="col-span-2 space-y-2">
                <div
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer"
                  onClick={() => setIsUpiDetailsOpen(!isUpiDetailsOpen)}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Wholesaler UPI Details</span>
                  </div>
                  {isUpiDetailsOpen ? (
                    <ChevronUp className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-blue-600" />
                  )}
                </div>

                {isUpiDetailsOpen && (
                  <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    {wholesalerUpiInfo.primaryUpiId && (
                      <div className="mb-4">
                        <Label className="text-sm text-gray-600">UPI ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-gray-50 px-3 py-2 rounded border text-sm font-mono flex-1 text-gray-800">
                            {wholesalerUpiInfo.primaryUpiId}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(wholesalerUpiInfo.primaryUpiId || '');
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}

                    {wholesalerUpiInfo.primaryQrCodeUrl && (
                      <div>
                        <Label className="text-sm text-gray-600">Scan QR Code</Label>
                        <div className="mt-2 flex justify-center">
                          <img
                            src={wholesalerUpiInfo.primaryQrCodeUrl}
                            alt="Payment QR Code"
                            className="max-w-[180px] rounded-lg border shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* UTR Field & Payment Proof - Only shown for UPI payments */}
            {formData.paymentMethod === 'UPI' && (
              <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t mt-2">
                {/* UTR Field */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium text-gray-700">UTR (Last 4 Digits) *</Label>
                    <span className="text-xs text-red-500 italic">Required</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="1234"
                    value={formData.utr || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers, max 4 digits
                      if (/^\d{0,4}$/.test(value)) {
                        updateField('utr', value);
                      }
                    }}
                    maxLength={4}
                    className="h-10"
                  />
                </div>

                {/* Payment Proof Upload */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium text-gray-700">Payment Screenshot</Label>
                    <span className="text-xs text-gray-500 italic">Optional</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    // capture="environment" - Removed to allow Gallery selection
                    onChange={handleImageChange}
                  />

                  {!previewUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        fileInputRef.current?.click();
                      }}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture / Upload
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {/* Visible Image Preview */}
                      <div className="relative rounded-lg overflow-hidden border border-green-200 bg-green-50 p-2">
                        <div className="flex items-start gap-3">
                          <img
                            src={previewUrl}
                            className="w-20 h-20 object-cover rounded-md border border-gray-200 shadow-sm"
                            alt="Payment Proof Preview"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-green-700 text-sm font-medium">
                              <CheckCircle className="h-4 w-4" />
                              Image Attached
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {formData.proofImage?.name || 'proof_image.jpg'}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              onClick={removeImage}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove & Recapture
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
            disabled={collectingPayment || !formData.retailerId || !formData.amount || formData.amount < 1 || (formData.paymentMethod === 'UPI' && !(formData.utr && formData.utr.length === 4) && !formData.proofImage)}
            className="h-10 px-4 text-sm min-w-[120px] w-full sm:w-auto order-1 sm:order-2"
          >
            {collectingPayment ? (
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </div>
            ) : (
              'Collect Payment'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const CollectPaymentForm = React.memo(CollectPaymentFormComponent);
