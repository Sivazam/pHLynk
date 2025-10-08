'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompactDatePicker } from '@/components/ui/compact-date-picker';
import { Confetti } from '@/components/ui/Confetti';
import { Retailer } from '@/types';
import { formatCurrency } from '@/lib/timestamp-utils';
import { 
  Plus,
  Trash2,
  Package,
  Calculator,
  CheckCircle
} from 'lucide-react';

interface LineItem {
  name: string;
  qty: number;
  unitPrice: number;
  gstPercent: number;
}

interface InvoiceForm {
  retailerId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  lineItems: LineItem[];
}

interface CreateInvoiceFormProps {
  retailers: Retailer[];
  onCreateInvoice: (formData: InvoiceForm) => Promise<void>;
  onCancel: () => void;
  creatingInvoice: boolean;
}

// Memoized line item component for better performance
const LineItemRow = React.memo(({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  total
}: {
  item: LineItem;
  index: number;
  onUpdate: (index: number, field: keyof LineItem, value: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  total: string;
}) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg border">
      <div className="col-span-5">
        <div className="flex items-center space-x-1">
          <Package className="h-3 w-3 text-gray-400" />
          <Input
            placeholder="Item name"
            value={item.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          min="1"
          value={item.qty}
          onChange={(e) => onUpdate(index, 'qty', parseInt(e.target.value) || 1)}
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onUpdate(index, 'unitPrice', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={item.gstPercent}
          onChange={(e) => onUpdate(index, 'gstPercent', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
          placeholder="0.0"
        />
      </div>
      <div className="col-span-1">
        <div className="text-xs font-medium text-gray-900 bg-white px-2 py-1 rounded border text-center">
          {total}
        </div>
      </div>
      <div className="col-span-1">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
});

LineItemRow.displayName = 'LineItemRow';

const CreateInvoiceFormComponent = ({ 
  retailers, 
  onCreateInvoice, 
  onCancel, 
  creatingInvoice 
}: CreateInvoiceFormProps) => {
  // Use refs for stable callbacks
  const onCreateRef = useRef(onCreateInvoice);
  
  // Success and confetti state
  const [showSuccess, setShowSuccess] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  
  // Update refs when props change
  useEffect(() => {
    onCreateRef.current = onCreateInvoice;
  }, [onCreateInvoice]);

  // Optimized state management
  const [formData, setFormData] = useState<InvoiceForm>(() => ({
    retailerId: '',
    invoiceNumber: '',
    issueDate: new Date(),
    dueDate: new Date(),
    lineItems: [{ name: '', qty: 1, unitPrice: 0, gstPercent: 0 }]
  }));

  // Memoized totals calculation
  const totals = useMemo(() => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const gstAmount = formData.lineItems.reduce((sum, item) => {
      const gstPercent = item.gstPercent || 0;
      return sum + (item.qty * item.unitPrice * gstPercent / 100);
    }, 0);
    const totalAmount = subtotal + gstAmount;
    
    return { subtotal, gstAmount, totalAmount };
  }, [formData.lineItems]);

  // Memoized line item totals
  const lineItemTotals = useMemo(() => {
    return formData.lineItems.map(item => 
      formatCurrency((item.qty || 0) * (item.unitPrice || 0) * (1 + (item.gstPercent || 0) / 100))
    );
  }, [formData.lineItems]);

  // Optimized update functions
  const updateField = useCallback((field: keyof InvoiceForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateLineItem = useCallback((index: number, field: keyof LineItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const addLineItem = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { name: '', qty: 1, unitPrice: 0, gstPercent: 0 }]
    }));
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.retailerId) {
      alert('Please select a retailer');
      return;
    }
    
    if (!formData.invoiceNumber.trim()) {
      alert('Please enter an invoice number');
      return;
    }
    
    if (!formData.lineItems.some(item => item.name.trim() && item.unitPrice > 0)) {
      alert('Please add at least one valid line item');
      return;
    }
    
    try {
      await onCreateRef.current(formData);
      // Show success state and trigger confetti
      setShowSuccess(true);
      setTriggerConfetti(true);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          retailerId: '',
          invoiceNumber: '',
          issueDate: new Date(),
          dueDate: new Date(),
          lineItems: [{ name: '', qty: 1, unitPrice: 0, gstPercent: 0 }]
        });
        setShowSuccess(false);
        onCancel();
      }, 2000);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    }
  }, [formData.retailerId, formData.invoiceNumber, formData.lineItems, onCancel]);

  const handleConfettiComplete = () => {
    setTriggerConfetti(false);
  };

  // Memoized retailer options
  const retailerOptions = useMemo(() => {
    return retailers.map((retailer) => (
      <SelectItem key={retailer.id} value={retailer.id}>
        {retailer.name}
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
            <h3 className="text-lg font-semibold text-green-700 mb-2">Invoice Created Successfully!</h3>
            <p className="text-gray-600">The new invoice has been created and is ready to use.</p>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="space-y-4 pb-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Create New Invoice</h2>
              <p className="text-sm text-gray-600">Fill in the details below to generate a new invoice</p>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-1">Basic Information</h3>
              
              {/* Retailer Selection */}
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Retailer *</Label>
                <Select 
                  value={formData.retailerId} 
                  onValueChange={(value) => updateField('retailerId', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select retailer" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailerOptions}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Number */}
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Invoice Number *</Label>
                <Input
                  placeholder="e.g., INV-2024-001"
                  value={formData.invoiceNumber}
                  onChange={(e) => updateField('invoiceNumber', e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-gray-500">This is your reference number for tracking</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <CompactDatePicker
                  value={formData.issueDate}
                  onChange={(date) => date && updateField('issueDate', date)}
                  label="Issue Date"
                />
                <CompactDatePicker
                  value={formData.dueDate}
                  onChange={(date) => date && updateField('dueDate', date)}
                  label="Due Date"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 border-b pb-1">Line Items *</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addLineItem}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>

              {/* Line Items Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 rounded text-xs font-medium text-gray-600">
                <div className="col-span-5">Item Name</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Unit Price</div>
                <div className="col-span-2 text-center">GST %</div>
                <div className="col-span-1 text-center">Total</div>
              </div>

              {/* Line Items List */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.lineItems.map((item, index) => (
                  <LineItemRow
                    key={index}
                    item={item}
                    index={index}
                    onUpdate={updateLineItem}
                    onRemove={removeLineItem}
                    canRemove={formData.lineItems.length > 1}
                    total={lineItemTotals[index]}
                  />
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Invoice Summary</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST Amount:</span>
                  <span className="font-medium">{formatCurrency(totals.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span className="text-gray-900">Total Amount:</span>
                  <span className="text-gray-900">{formatCurrency(totals.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={creatingInvoice}
                className="h-9 px-4 text-sm"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={creatingInvoice}
                className="h-9 px-4 text-sm"
              >
                {creatingInvoice ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export const CreateInvoiceForm = React.memo(CreateInvoiceFormComponent);