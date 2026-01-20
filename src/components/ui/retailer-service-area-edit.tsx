'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { Area, Retailer } from '@/types';

interface RetailerServiceAreaEditProps {
  retailer: Retailer;
  onSubmit: (data: { areaId?: string; zipcodes: string[]; code?: string }) => Promise<void>;
  onCancel: () => void;
  areas: Area[];
}

export function RetailerServiceAreaEdit({
  retailer,
  onSubmit,
  onCancel,
  areas
}: RetailerServiceAreaEditProps) {
  const [areaId, setAreaId] = useState(retailer.areaId || 'none');
  const [zipcodes, setZipcodes] = useState<string[]>(retailer.zipcodes || []);
  const [newZipcode, setNewZipcode] = useState('');
  const [code, setCode] = useState(retailer.code || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        areaId: areaId && areaId !== 'none' ? areaId : undefined,
        zipcodes: zipcodes.filter(z => z.trim()),
        code: code.trim() || undefined
      });

      setShowSuccess(true);
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);
    } catch (error) {
      console.error('❌ Error updating retailer service area:', error);
    } finally {
      setIsSubmitting(false);
    }
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
      if (selectedAreaId && selectedAreaId !== 'none') {
        const selectedArea = areas.find(a => a.id === selectedAreaId);
        if (selectedArea) {
          setZipcodes(selectedArea.zipcodes);
        }
      } else {
        setZipcodes([]);
      }
    }
  };

  if (showSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-700 mb-2">
          Service Area Updated Successfully!
        </h3>
        <p className="text-gray-600">
          The retailer's service area has been updated.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Retailer Info Display (Read-only) */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Retailer Information</h3>
            <p className="text-sm text-gray-600">You can only edit the service area</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Name:</span>
            <p className="text-gray-900">{retailer.name}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Phone:</span>
            <p className="text-gray-900">{retailer.phone}</p>
          </div>
          {retailer.address && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Address:</span>
              <p className="text-gray-900">{retailer.address}</p>
            </div>
          )}
          {retailer.code && (
            <div>
              <span className="font-medium text-gray-700">Current Code:</span>
              <p className="text-gray-900">{retailer.code}</p>
            </div>
          )}
        </div>
      </div>

      {/* Editable Service Area Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="area">Service Area</Label>
          <Select value={areaId} onValueChange={handleAreaChange} disabled={isSubmitting}>
            <SelectTrigger>
              <SelectValue placeholder="Select service area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific area</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
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
  );
}