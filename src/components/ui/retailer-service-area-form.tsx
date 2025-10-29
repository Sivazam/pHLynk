'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Package, Loader2, CheckCircle } from 'lucide-react';
import { Area, Retailer } from '@/types';

interface RetailerServiceAreaFormProps {
  onSubmit: (data: { areaId?: string; zipcodes: string[] }) => Promise<void>;
  areas: Area[];
  onCancel?: () => void;
  initialData?: { areaId?: string; zipcodes: string[] };
  retailerName?: string;
  retailerPhone?: string;
  retailerAddress?: string;
}

export function RetailerServiceAreaForm({ 
  onSubmit, 
  areas, 
  onCancel, 
  initialData,
  retailerName,
  retailerPhone,
  retailerAddress
}: RetailerServiceAreaFormProps) {
  const [areaId, setAreaId] = useState(initialData?.areaId || '');
  const [zipcodes, setZipcodes] = useState<string[]>(initialData?.zipcodes || []);
  const [newZipcode, setNewZipcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (zipcodes.length > 0 || areaId === 'no-specific-area') {
      setIsSubmitting(true);
      try {
        await onSubmit({
          areaId: areaId === 'no-specific-area' ? undefined : (areaId || undefined),
          zipcodes: zipcodes.filter(z => z.trim())
        });
        
        // Show success state
        setShowSuccess(true);
        
        // Reset form after success
        setTimeout(() => {
          if (onCancel) onCancel();
        }, 2000);
      } catch (error) {
        console.error('Error updating service area:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
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
    <div className="space-y-4">
      {/* Retailer Information Display (Read-only) */}
      {(retailerName || retailerPhone || retailerAddress) && (
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-700">Retailer Information</CardTitle>
            <CardDescription className="text-xs">
              Basic retailer details cannot be modified by wholesaler
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              {retailerName && (
                <div>
                  <Label className="text-xs text-gray-500">Business Name</Label>
                  <p className="font-medium">{retailerName}</p>
                </div>
              )}
              {retailerPhone && (
                <div>
                  <Label className="text-xs text-gray-500">Phone Number</Label>
                  <p className="font-medium">{retailerPhone}</p>
                </div>
              )}
              {retailerAddress && (
                <div>
                  <Label className="text-xs text-gray-500">Address</Label>
                  <p className="font-medium">{retailerAddress}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showSuccess ? (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-700 mb-2">
            Service Area Updated Successfully!
          </h3>
          <p className="text-gray-600">
            The retailer's service area has been updated in your network.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <Label htmlFor="zipcodes">Service Zipcodes</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  id="zipcodes"
                  type="text"
                  value={newZipcode}
                  onChange={(e) => setNewZipcode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter zipcode"
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  type="button" 
                  onClick={addZipcode} 
                  variant="outline" 
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (zipcodes.length === 0 && areaId !== 'no-specific-area')}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Service Area'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}