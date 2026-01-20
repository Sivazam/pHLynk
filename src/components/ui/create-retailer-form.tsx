'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Confetti } from '@/components/ui/Confetti';
import { RetailerPhoneLookup } from '@/components/ui/retailer-phone-lookup';
import { X, Plus, Phone, MapPin, Loader2, CheckCircle, Search, UserPlus } from 'lucide-react';
import { Area, Retailer } from '@/types';

interface CreateRetailerFormProps {
  onSubmit: (data: { name: string; phone: string; address?: string; areaId?: string; zipcodes: string[]; code?: string }) => Promise<void>;
  onAddExistingRetailer?: (retailer: Retailer, areaId?: string, zipcodes?: string[]) => Promise<void>;
  areas: Area[];
  existingRetailers?: Retailer[]; // List of retailers already in wholesaler's network
  onCancel?: () => void;
  initialData?: { name: string; phone: string; address?: string; areaId?: string; zipcodes: string[]; code?: string };
  showPhoneLookup?: boolean;
}

type FormMode = 'create' | 'update' | 'lookup';

export function CreateRetailerForm({
  onSubmit,
  onAddExistingRetailer,
  areas,
  existingRetailers = [],
  onCancel,
  initialData,
  showPhoneLookup = true
}: CreateRetailerFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [areaId, setAreaId] = useState(initialData?.areaId || '');
  const [zipcodes, setZipcodes] = useState<string[]>(initialData?.zipcodes || []);
  const [newZipcode, setNewZipcode] = useState('');
  const [code, setCode] = useState(initialData?.code || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(initialData ? 'update' : (showPhoneLookup ? 'lookup' : 'create'));
  const [foundRetailer, setFoundRetailer] = useState<Retailer | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Form submission attempt:', {
      name: name.trim(),
      phone: phone.trim(),
      formMode,
      foundRetailer: !!foundRetailer,
      zipcodesLength: zipcodes.length,
      areaId,
      canSubmit: name.trim() && phone.trim() && (formMode === 'update' || foundRetailer || zipcodes.length > 0 || areaId === 'no-specific-area')
    });

    if (name.trim() && phone.trim() && (formMode === 'update' || foundRetailer || zipcodes.length > 0 || areaId === 'no-specific-area')) {
      setIsSubmitting(true);
      try {
        // If we found an existing retailer, add it to the network instead of creating a new one
        if (foundRetailer && onAddExistingRetailer) {
          console.log('🔍 Adding existing retailer to network:', foundRetailer.profile ? foundRetailer.profile.realName : foundRetailer.name);
          // Get area zipcodes if area is selected, otherwise use empty array
          const areaZipcodes = areaId ? areas.find(a => a.id === areaId)?.zipcodes || [] : [];
          await onAddExistingRetailer(foundRetailer, areaId || undefined, areaZipcodes);
        } else {
          console.log('🔍 Creating new retailer:', name.trim());
          await onSubmit({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim() || undefined,
            areaId: areaId === 'no-specific-area' ? undefined : (areaId || undefined),
            zipcodes: zipcodes.filter(z => z.trim()),
            code: code.trim() || undefined
          });
        }
        // Show success state and trigger confetti
        setShowSuccess(true);
        setTriggerConfetti(true);

        // Reset form after success
        setTimeout(() => {
          resetForm();
          if (onCancel) onCancel();
        }, 2000);
      } catch (error) {
        console.error('Error submitting form:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.log('❌ Form validation failed');
    }
  };

  const handleConfettiComplete = () => {
    setTriggerConfetti(false);
  };

  const handleRetailerFound = (retailer: Retailer) => {
    setFoundRetailer(retailer);
    setFormMode('create');
    // Pre-fill form with found retailer data but NOT service areas
    // Handle both legacy and new profile formats
    const retailerName = retailer.profile ? retailer.profile.realName : retailer.name;
    const retailerPhone = retailer.profile ? retailer.profile.phone : retailer.phone;
    const retailerAddress = retailer.profile ? retailer.profile.address : retailer.address;

    setName(retailerName || '');
    setPhone(retailerPhone || '');
    setAddress(retailerAddress || '');
    // Clear area and zipcodes to let wholesaler assign their own
    setAreaId('');
    setZipcodes([]);
  };

  const handleAddExistingRetailer = async () => {
    if (foundRetailer && onAddExistingRetailer) {
      setIsSubmitting(true);
      try {
        // Get area zipcodes if area is selected, otherwise use empty array
        const areaZipcodes = areaId ? areas.find(a => a.id === areaId)?.zipcodes || [] : [];
        await onAddExistingRetailer(foundRetailer, areaId || undefined, areaZipcodes);
        setShowSuccess(true);
        setTriggerConfetti(true);

        setTimeout(() => {
          resetForm();
          if (onCancel) onCancel();
        }, 2000);
      } catch (error) {
        console.error('Error adding existing retailer:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAddNewRetailer = (searchedPhone?: string) => {
    // Use the phone passed from lookup, or keep current phone
    const phoneToKeep = searchedPhone || phone;
    resetForm();
    setPhone(phoneToKeep);
    setFormMode('create');
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setAreaId('');
    setZipcodes([]);
    setNewZipcode('');
    setCode('');
    setFoundRetailer(null);
    setShowSuccess(false);
    if (showPhoneLookup && !initialData) {
      setFormMode('lookup');
    }
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) onCancel();
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
      addZipcode();
    }
  };

  // Auto-populate zipcodes when area is selected
  const handleAreaChange = (selectedAreaId: string) => {
    if (!isSubmitting) {
      setAreaId(selectedAreaId);
      if (selectedAreaId && selectedAreaId !== 'no-specific-area') {
        const selectedArea = areas.find(a => a.id === selectedAreaId);
        if (selectedArea) {
          setZipcodes(selectedArea.zipcodes);
        }
      } else {
        setZipcodes([]);
      }
    }
  };

  return (
    <>
      <Confetti trigger={triggerConfetti} onComplete={handleConfettiComplete} />

      {/* Phone Lookup Mode */}
      {formMode === 'lookup' && (
        <RetailerPhoneLookup
          onRetailerFound={handleRetailerFound}
          onAddNewRetailer={handleAddNewRetailer}
          onCancel={handleCancel}
          loading={isSubmitting}
          existingRetailers={existingRetailers}
        />
      )}

      {/* Create/Update Form Mode */}
      {(formMode === 'create' || formMode === 'update') && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {showSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                {formMode === 'update' ? 'Retailer Updated Successfully!' :
                  foundRetailer ? 'Retailer Added Successfully!' : 'Retailer Created Successfully!'}
              </h3>
              <p className="text-gray-600">
                {formMode === 'update' ? 'The retailer has been updated.' :
                  foundRetailer ? 'The existing retailer has been added to your account.' :
                    'The new retailer has been created and is ready to use.'}
              </p>
            </div>
          ) : (
            <>
              {/* Show found retailer info if adding existing retailer */}
              {foundRetailer && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">Adding Existing Retailer</h3>
                        <p className="text-sm text-blue-700">Assign service areas for this retailer in your network</p>
                      </div>
                    </div>
                    <div className="text-sm text-blue-800 mb-3">
                      <p><strong>Name:</strong> {foundRetailer.profile ? foundRetailer.profile.realName : foundRetailer.name}</p>
                      <p><strong>Phone:</strong> {foundRetailer.profile ? foundRetailer.profile.phone : foundRetailer.phone}</p>
                      {(foundRetailer.profile ? foundRetailer.profile.address : foundRetailer.address) && (
                        <p><strong>Address:</strong> {foundRetailer.profile ? foundRetailer.profile.address : foundRetailer.address}</p>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                      <p>💡 <strong>Note:</strong> This retailer already exists. You can now assign service areas specific to your wholesaler network.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="retailerName">Retailer Name</Label>
                  <Input
                    id="retailerName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter retailer name"
                    required
                    disabled={isSubmitting || foundRetailer !== null}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    required
                    disabled={isSubmitting || foundRetailer !== null}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter retailer address (optional)"
                  rows={3}
                  disabled={isSubmitting || foundRetailer !== null}
                />
              </div>

              <div>
                <Label htmlFor="code">Retailer Code (Optional)</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., ABC1234 (4-8 characters)"
                  maxLength={12}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Alphanumeric code to identify this retailer</p>
              </div>

              <div>
                <Label htmlFor="area">Service Area</Label>
                <Select value={areaId} onValueChange={handleAreaChange} disabled={isSubmitting}>
                  <SelectTrigger>
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

              {/* Only show zipcode section for new retailers (not existing ones) */}
              {!foundRetailer && (
                <div>
                  <Label htmlFor="zipcodes">Service Zipcodes</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="zipcodes"
                        value={newZipcode}
                        onChange={(e) => setNewZipcode(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter zipcode"
                        disabled={isSubmitting}
                      />
                      <Button type="button" onClick={addZipcode} variant="outline" disabled={isSubmitting}>
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
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                {showPhoneLookup && !initialData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      console.log('🔍 Search Retailer button clicked');
                      setFormMode('lookup');
                    }}
                    disabled={isSubmitting}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Retailer
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting || !name || !name.trim() || !phone || !phone.trim() || (formMode !== 'update' && !foundRetailer && zipcodes.length === 0 && areaId !== 'no-specific-area')}
                  onClick={() => {
                    console.log('🔍 Submit button clicked');
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {formMode === 'update' ? 'Updating...' :
                        foundRetailer ? 'Adding to Network...' : 'Creating...'}
                    </>
                  ) : (
                    formMode === 'update' ? 'Update Retailer' :
                      foundRetailer ? 'Add Retailer to Network' : 'Create Retailer'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </>
  );
}