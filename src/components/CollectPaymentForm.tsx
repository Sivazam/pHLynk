'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Check,
  ChevronsUpDown,
  Search,
  MapPin,
  Phone,
  Settings,
  Info,
  Lock,
  RefreshCw,
  AlertTriangle,
  Calendar as CalendarIcon
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

import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { INDIAN_BANKS } from '@/constants/banks';

// --- EXTRACTED COMPONENT FOR SELECTION PERFORMANCE ---
const RetailerSelector = React.memo(({
  retailers,
  onSelect,
  selectedId
}: {
  retailers: Retailer[],
  onSelect: (id: string) => void,
  selectedId: string
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Performance Optimization: Show max 3 matches as per requirement
  const visibleRetailers = useMemo(() => {
    if (!retailers) return [];
    if (!query) return retailers.slice(0, 3); // Show top 3 by default

    const q = query.toLowerCase();
    const filtered: Retailer[] = [];
    for (const r of retailers) {
      if (filtered.length >= 3) break; // Limit search results to 3
      const name = (r.profile?.realName || r.name || '').toLowerCase();
      const code = (r.code || '').toLowerCase();
      const phone = (r.profile?.phone || r.phone || '').toLowerCase();
      if (name.includes(q) || code.includes(q) || phone.includes(q)) {
        filtered.push(r);
      }
    }
    return filtered;
  }, [retailers, query]);

  const selectedRetailer = useMemo(() =>
    retailers.find(r => r.id === selectedId)
    , [retailers, selectedId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between h-11 w-full bg-white"
        >
          {selectedRetailer ? (
            <div className="flex flex-col items-start truncate overflow-hidden">
              <span className="truncate w-full text-left font-medium text-gray-900">
                {selectedRetailer.profile?.realName || selectedRetailer.name}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Search retailer name, code...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-3rem)] sm:w-[500px] p-0 shadow-2xl border-gray-200 z-[100]"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={10}
      >
        <Command shouldFilter={false} className="overflow-hidden">
          <CommandInput
            placeholder="Type name or code to search..."
            className="h-11 border-none focus:ring-0"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[250px] sm:max-h-[300px] overflow-y-auto overscroll-contain">
            <CommandEmpty className="py-6 text-center text-sm text-gray-500">No retailer found.</CommandEmpty>
            <CommandGroup>
              {visibleRetailers.map((retailer) => (
                <CommandItem
                  key={retailer.id}
                  value={retailer.id}
                  onSelect={() => {
                    onSelect(retailer.id);
                    setOpen(false);
                    setQuery(''); // Reset query on selection
                  }}
                  className="cursor-pointer py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0 text-green-600",
                      selectedId === retailer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-3 w-full overflow-hidden">
                    {retailer.code && (
                      <span className="flex-shrink-0 bg-yellow-100 text-yellow-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-yellow-200">
                        {retailer.code}
                      </span>
                    )}
                    <div className="flex flex-col truncate">
                      <span className="font-medium truncate text-gray-900 text-sm">
                        {retailer.profile?.realName || retailer.name}
                      </span>
                      {(retailer.profile?.phone || retailer.phone) && (
                        <span className="text-[10px] text-gray-500 truncate">
                          {retailer.profile?.phone || retailer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
RetailerSelector.displayName = "RetailerSelector";

// --- BANK SELECTOR COMPONENT ---
const BankSelector = React.memo(({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Handle free text input in query
  const handleQueryChange = (val: string) => {
    setQuery(val);
    // If user is typing, we can optimistically set the value to what they typed
    // This supports the "directly type bank name" requirement
    if (!open) {
      if (val !== value) onChange(val);
    }
  };

  // Logic: Show max 2 matching banks
  const filteredBanks = useMemo(() => {
    if (!query) return INDIAN_BANKS.slice(0, 2); // Show top 2 by default
    const q = query.toLowerCase();
    const matches = INDIAN_BANKS.filter(bank => bank.toLowerCase().includes(q));
    return matches.slice(0, 2); // Only show 2 matching
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between h-11 w-full bg-white text-left font-normal"
        >
          <span className={cn("truncate", !value && "text-gray-500")}>
            {value || "Select or type bank name..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search bank..."
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-sm text-gray-500">
              <div
                className="cursor-pointer p-2 hover:bg-gray-100 rounded text-blue-600 font-medium"
                onClick={() => {
                  onChange(query);
                  setOpen(false);
                }}
              >
                Use "{query}"
              </div>
            </CommandEmpty>
            <CommandGroup heading="Suggestions">
              {filteredBanks.map((bank) => (
                <CommandItem
                  key={bank}
                  value={bank}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === bank ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {bank}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
BankSelector.displayName = "BankSelector";

interface PaymentForm {
  retailerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  utr?: string; // UTR for UPI payments (last 4 digits)
  chequeNumber?: string;
  chequeDate?: Date;
  bankName?: string;
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
  // collectingPayment: boolean;
  // wholesalerUpiInfo?: WholesalerUpiInfo;
  isOpen?: boolean;
  initialPaymentData?: PaymentForm | null;
}

const CollectPaymentFormComponent = ({
  retailers,
  preSelectedRetailer,
  onCollectPayment,
  onCancel,
  // collectingPayment,
  // wholesalerUpiInfo,
  collectingPayment,
  wholesalerUpiInfo,
  isOpen,
  initialPaymentData
}: CollectPaymentFormProps) => {
  // ✅ Removed success/confetti state - now it's a pure data collection form

  const [formData, setFormData] = useState<PaymentForm>(() => ({
    retailerId: preSelectedRetailer?.id || '',
    amount: 0,
    paymentMethod: 'CASH',
    utr: '',
    chequeNumber: '',
    chequeDate: undefined,
    bankName: '',
    notes: '',
    proofImage: null
  }));

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialPaymentData) {
        setFormData(initialPaymentData);
      } else {
        setFormData({
          retailerId: preSelectedRetailer?.id || '',
          amount: 0,
          paymentMethod: 'CASH',
          utr: '',
          chequeNumber: '',
          chequeDate: undefined,
          bankName: '',
          notes: '',
          proofImage: null
        });
      }
      setError(null);
      setPreviewUrl(null);
    }
  }, [isOpen, preSelectedRetailer, initialPaymentData]);

  const [error, setError] = useState<string | null>(null);
  const [isUpiDetailsOpen, setIsUpiDetailsOpen] = useState(false); // Default collapsed
  const [isChequeDateOpen, setIsChequeDateOpen] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Removed unnecessary camera permission checks as we use standard file input





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

    // Validate Cheque Details
    if (formData.paymentMethod === 'CHEQUE') {
      if (!formData.bankName) {
        setError('Please select or enter the Bank Name');
        return;
      }
      if (!formData.chequeNumber || formData.chequeNumber.length !== 6) {
        setError('Please enter a valid 6-digit Cheque Number');
        return;
      }
      if (!formData.chequeDate) {
        setError('Please select the Cheque Date');
        return;
      }
    }

    try {
      setError(null);
      console.log('🚀 Submitting payment data...', formData);

      // Call parent callback - parent will handle confirmation and success
      await onCollectPayment(formData);

      // Close form after successful submission
      // onCancel(); // REMOVED: Parent handles closing via state update in onCollectPayment
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
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Payment Information - Mobile First Grid */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Payment Information</h3>

          {/* Grid Layout for Mobile First */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">

            {/* Row 1: Retailer Selection - Full width on mobile */}
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-sm font-medium text-gray-700">Retailer *</Label>
              <RetailerSelector
                retailers={retailers}
                selectedId={formData.retailerId}
                onSelect={(id) => updateField('retailerId', id)}
              />

              {selectedRetailer && (
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-600 space-y-1">
                  {selectedRetailer.profile?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-gray-400" />
                      <span className="leading-snug">{selectedRetailer.profile.address}</span>
                    </div>
                  )}
                  <div className="flex gap-4 pt-1">
                    {selectedRetailer.code && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-400"></div>
                        {selectedRetailer.code}
                      </span>
                    )}
                    {(selectedRetailer.profile?.phone || selectedRetailer.phone) && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {selectedRetailer.profile?.phone || selectedRetailer.phone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Row 2: Amount and Payment Method - Side by side on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Amount *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-sm font-medium text-gray-500">₹</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={formData.amount ? formData.amount.toString() : ''}
                    inputMode="decimal"
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (/^\d*\.?\d*$/.test(value) || value === '') {
                        const numValue = parseFloat(value) || 0;
                        updateField('amount', numValue);
                      }
                    }}
                    className="h-11 pl-8 text-lg font-semibold text-gray-900"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => updateField('paymentMethod', value)}
                >
                  <SelectTrigger className="h-11 font-medium">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* UPI Payment Details - Collapsible */}
              {formData.paymentMethod === 'UPI' && wholesalerUpiInfo && (wholesalerUpiInfo.primaryUpiId || wholesalerUpiInfo.primaryQrCodeUrl) && (
                <div className="col-span-2 space-y-2">
                  <div
                    className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors"
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
                          <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">UPI ID</Label>
                          <div className="flex items-center gap-2 mt-1.5">
                            <code className="bg-gray-50 px-3 py-2.5 rounded border border-gray-200 text-sm font-mono flex-1 text-gray-900 font-medium">
                              {wholesalerUpiInfo.primaryUpiId}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10"
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
                          <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scan QR Code</Label>
                          <div className="mt-3 flex justify-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit mx-auto">
                            <img
                              src={wholesalerUpiInfo.primaryQrCodeUrl}
                              alt="Payment QR Code"
                              className="w-64 h-64 object-contain rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cheque Payment Details */}
              {formData.paymentMethod === 'CHEQUE' && (
                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-2">
                  {/* Bank Name - Full Width */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">Bank Name *</Label>
                    <BankSelector
                      value={formData.bankName || ''}
                      onChange={(val) => updateField('bankName', val)}
                    />
                  </div>

                  {/* Cheque Number */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Cheque Number (6-digits) *</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 123456"
                      value={formData.chequeNumber || ''}
                      inputMode="numeric"
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers, max 6 digits
                        if (/^\d{0,6}$/.test(value)) {
                          updateField('chequeNumber', value);
                        }
                      }}
                      maxLength={6}
                      className="h-11 font-mono tracking-widest text-center text-lg"
                    />
                  </div>

                  {/* Cheque Date */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Cheque Date *</Label>
                    {/* Mobile: Native Date Input */}
                    <div className="md:hidden">
                      <Input
                        type="date"
                        value={formData.chequeDate ? format(formData.chequeDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateField('chequeDate', e.target.value ? new Date(e.target.value) : undefined)}
                        className="w-full"
                      />
                    </div>

                    {/* Desktop: Custom Popover Calendar */}
                    <div className="hidden md:block">
                      <Popover open={isChequeDateOpen} onOpenChange={setIsChequeDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-11 justify-start text-left font-normal",
                              !formData.chequeDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.chequeDate ? format(formData.chequeDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.chequeDate}
                            onSelect={(date) => {
                              updateField('chequeDate', date);
                              setIsChequeDateOpen(false);
                            }}
                            initialFocus
                            disabled={(date) =>
                              date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}

              {/* UTR Field & Payment Proof - Only shown for UPI payments */}
              {formData.paymentMethod === 'UPI' && (
                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-2">
                  {/* UTR Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium text-gray-700">UTR (Last 4 Digits) *</Label>
                    </div>
                    <Input
                      type="text"
                      placeholder="e.g. 1234"
                      value={formData.utr || ''}
                      inputMode="numeric"
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers, max 4 digits
                        if (/^\d{0,4}$/.test(value)) {
                          updateField('utr', value);
                        }
                      }}
                      maxLength={4}
                      className="h-11 font-mono tracking-widest text-center text-lg"
                    />
                  </div>

                  {/* Payment Proof Upload */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium text-gray-700">Screenshot</Label>
                      <span className="text-xs text-gray-500 italic bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>
                    </div>

                    {/* Native File Input for Camera/Gallery */}

                    {/* Hidden Inputs for Camera and Gallery */}
                    <input
                      type="file"
                      id="camera-input"
                      className="sr-only"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    />
                    <input
                      type="file"
                      id="gallery-input"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageChange}
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    />

                    {!previewUrl ? (
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          htmlFor="camera-input"
                          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-700 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 active:scale-[0.98]"
                        >
                          <Camera className="h-6 w-6 mb-2" />
                          <span className="text-xs font-bold text-center">Take Photo</span>
                        </label>

                        <label
                          htmlFor="gallery-input"
                          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-gray-700 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 active:scale-[0.98]"
                        >
                          <Upload className="h-6 w-6 mb-2" />
                          <span className="text-xs font-bold text-center">Upload Gallery</span>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Visible Image Preview */}
                        <div className="relative rounded-lg overflow-hidden border border-green-200 bg-green-50/50 p-2">
                          <div className="flex items-start gap-3">
                            <img
                              src={previewUrl}
                              className="w-16 h-16 object-cover rounded-md border border-gray-200 shadow-sm"
                              alt="Payment Proof Preview"
                            />
                            <div className="flex-1 min-w-0 flex flex-col justify-between h-16 py-1">
                              <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                                <CheckCircle className="h-4 w-4" />
                                <span className="truncate">Attached successfully</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 -ml-2 w-fit"
                                onClick={removeImage}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove
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
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Notes</Label>
              <Input
                placeholder="Optional notes..."
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* Extra spacing at bottom of scrollable area ensures content isn't hidden by shadows */}
        <div className="h-4"></div>
      </div>

      {/* Footer / Action Buttons - Sticky to bottom */}
      <div className="p-4 bg-gray-50 border-t flex items-center gap-3 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={collectingPayment}
          className="flex-1 h-12 text-base font-medium border-gray-300 hover:bg-white hover:text-gray-900"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={collectingPayment || !formData.retailerId || !formData.amount || formData.amount < 1 ||
            (formData.paymentMethod === 'UPI' && !(formData.utr && formData.utr.length === 4)) ||
            (formData.paymentMethod === 'CHEQUE' && (!formData.bankName || !formData.chequeNumber || formData.chequeNumber.length !== 6 || !formData.chequeDate))
          }
          className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {collectingPayment ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </div>
          ) : (
            'Collect Payment'
          )}
        </Button>
      </div>
    </div >
  );
};

export const CollectPaymentForm = React.memo(CollectPaymentFormComponent);
