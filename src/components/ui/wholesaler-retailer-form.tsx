'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Confetti } from '@/components/ui/Confetti';
import { X, Plus, Phone, MapPin, Loader2, CheckCircle, Search, User, Store } from 'lucide-react';
import { Area } from '@/types';

interface WholesalerRetailerFormProps {
  onSubmit: (data: { retailerId?: string; name?: string; phone: string; address?: string; areaId?: string; zipcodes: string[] }) => Promise<void>;
  areas: Area[];
  onCancel?: () => void;
  tenantId: string;
}

interface RetailerLookupResult {
  id: string;
  name: string;
  phone: string;
  address?: string;
  isNew: boolean;
}

export function WholesalerRetailerForm({ onSubmit, areas, onCancel, tenantId }: WholesalerRetailerFormProps) {
  const [step, setStep] = useState<'lookup' | 'profile' | 'details'>('lookup');
  const [phone, setPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<RetailerLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  // Form state for new retailer creation
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState('');
  const [zipcodes, setZipcodes] = useState<string[]>([]);
  const [newZipcode, setNewZipcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  const handlePhoneLookup = async () => {
    if (!phone.trim()) {
      setLookupError('Please enter a phone number');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    
    try {
      console.log('🔍 Looking up retailer with phone:', phone);
      
      const response = await fetch('/api/wholesaler/lookup-retailer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone.trim(),
          tenantId: tenantId 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Retailer found:', result.retailer);
        
        // Check if retailer is already assigned to current tenant
        if (result.retailer.isAssignedToCurrentTenant) {
          setLookupError(result.message || 'This retailer is already assigned to your business.');
          return;
        }
        
        setLookupResult(result.retailer);
        setStep('profile');
        
        // Pre-fill form for new retailers
        if (result.retailer.isNew) {
          setName(result.retailer.name);
          setAddress(result.retailer.address || '');
        }
      } else {
        console.log('❌ Retailer not found:', result.message);
        setLookupError(result.message || 'Retailer not found');
      }
    } catch (error) {
      console.error('❌ Error looking up retailer:', error);
      setLookupError('Failed to lookup retailer. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddRetailer = async () => {
    setIsSubmitting(true);
    
    try {
      if (lookupResult) {
        // Add existing retailer to tenant
        console.log('🔗 Adding existing retailer to tenant:', lookupResult.id);
        
        const response = await fetch('/api/wholesaler/add-retailer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retailerId: lookupResult.id,
            tenantId: tenantId,
            areaId: areaId || undefined,
            zipcodes: zipcodes.length > 0 ? zipcodes : undefined
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Retailer added successfully:', result.message);
          setShowSuccess(true);
          setTriggerConfetti(true);
          
          setTimeout(() => {
            resetForm();
            if (onCancel) onCancel();
          }, 2000);
        } else {
          setLookupError(result.error || 'Failed to add retailer');
        }
      } else {
        // Create new retailer (fallback)
        await onSubmit({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          areaId: areaId || undefined,
          zipcodes: zipcodes.filter(z => z.trim())
        });
        
        setShowSuccess(true);
        setTriggerConfetti(true);
        
        setTimeout(() => {
          resetForm();
          if (onCancel) onCancel();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error adding retailer:', error);
      setLookupError('Failed to add retailer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('lookup');
    setPhone('');
    setLookupResult(null);
    setLookupError(null);
    setName('');
    setAddress('');
    setAreaId('');
    setZipcodes([]);
    setNewZipcode('');
    setShowSuccess(false);
    setTriggerConfetti(false);
  };

  const handleConfettiComplete = () => {
    setTriggerConfetti(false);
  };

  const addZipcode = () => {
    if (newZipcode.trim() && !zipcodes.includes(newZipcode.trim())) {
      setZipcodes([...zipcodes, newZipcode.trim()]);
      setNewZipcode('');
    }
  };

  const removeZipcode = (zipcode: string) => {
    setZipcodes(zipcodes.filter(z => z !== zipcode));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'lookup') {
        handlePhoneLookup();
      } else {
        addZipcode();
      }
    }
  };

  // Auto-populate zipcodes when area is selected
  const handleAreaChange = (selectedAreaId: string) => {
    setAreaId(selectedAreaId);
    if (selectedAreaId) {
      const selectedArea = areas.find(a => a.id === selectedAreaId);
      if (selectedArea) {
        setZipcodes(selectedArea.zipcodes);
      }
    } else {
      setZipcodes([]);
    }
  };

  return (
    <>
      <Confetti trigger={triggerConfetti} onComplete={handleConfettiComplete} />
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
        
        {/* Success State */}
        {showSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Retailer Added Successfully!
            </h3>
            <p className="text-gray-600">
              {lookupResult ? `"${lookupResult.name}" has been added to your business.` : 'The new retailer has been created and added to your business.'}
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Phone Lookup */}
            {step === 'lookup' && (
              <>
                <div className="space-y-4 pb-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Add Retailer</h2>
                  <p className="text-sm text-gray-600">Enter the retailer's mobile number to check if they already exist</p>
                </div>

                {lookupError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{lookupError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Mobile Number *</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="tel"
                        placeholder="Enter 10-digit mobile number"
                        value={phone}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numbers
                          if (/^\d*$/.test(value) && value.length <= 10) {
                            setPhone(value);
                            setLookupError(null);
                          }
                        }}
                        onKeyPress={handleKeyPress}
                        className="h-9 pl-9"
                        disabled={isLookingUp}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Enter 10-digit mobile number without country code</p>
                  </div>

                  <Button 
                    onClick={handlePhoneLookup}
                    disabled={isLookingUp || phone.length !== 10}
                    className="w-full h-9"
                  >
                    {isLookingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search Retailer
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Retailer Profile */}
            {step === 'profile' && lookupResult && (
              <>
                <div className="space-y-4 pb-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Retailer Found</h2>
                  <p className="text-sm text-gray-600">
                    {lookupResult.isNew 
                      ? 'New retailer found. You can add them to your business.' 
                      : 'Existing retailer found. You can add them to your business.'}
                  </p>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-blue-900 truncate">
                          {lookupResult.name}
                        </h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-blue-700 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {lookupResult.phone}
                          </p>
                          {lookupResult.address && (
                            <p className="text-sm text-blue-700 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {lookupResult.address}
                            </p>
                          )}
                        </div>
                        <div className="mt-2">
                          <Badge variant={lookupResult.isNew ? "secondary" : "default"}>
                            {lookupResult.isNew ? "New Retailer" : "Existing Retailer"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Assign Service Area</h3>
                  
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Service Area</Label>
                    <Select value={areaId} onValueChange={handleAreaChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select service area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-specific-area">No specific area</SelectItem>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Service Zipcodes</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newZipcode}
                          onChange={(e) => setNewZipcode(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Enter zipcode"
                          className="h-9"
                        />
                        <Button type="button" onClick={addZipcode} variant="outline" className="h-9">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {zipcodes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {zipcodes.map((zipcode) => (
                            <Badge key={zipcode} variant="secondary" className="flex items-center gap-1">
                              {zipcode}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeZipcode(zipcode)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="h-9 px-4 text-sm"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleAddRetailer}
                    disabled={isSubmitting}
                    className="h-9 px-4 text-sm min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Store className="w-3 h-3 mr-2" />
                        Add to Business
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}