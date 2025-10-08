'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, Phone, MapPin, Plus, CheckCircle } from 'lucide-react';
import { Retailer } from '@/types';

interface RetailerPhoneLookupProps {
  onRetailerFound: (retailer: Retailer) => void;
  onAddNewRetailer: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function RetailerPhoneLookup({ 
  onRetailerFound, 
  onAddNewRetailer, 
  onCancel, 
  loading = false 
}: RetailerPhoneLookupProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundRetailer, setFoundRetailer] = useState<Retailer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setSearching(true);
    setError(null);
    setFoundRetailer(null);

    try {
      console.log('🔍 Searching for retailer with phone:', cleanPhone);
      
      const response = await fetch('/api/retailer/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search retailer');
      }

      if (data.retailer) {
        console.log('✅ Retailer found:', data.retailer);
        setFoundRetailer(data.retailer);
      } else {
        console.log('ℹ️ No retailer found with this phone number');
        setError('No retailer found with this phone number');
      }
    } catch (error) {
      console.error('❌ Error searching retailer:', error);
      setError(error instanceof Error ? error.message : 'Failed to search retailer');
    } finally {
      setSearching(false);
    }
  };

  const handleAddExistingRetailer = () => {
    if (foundRetailer) {
      onRetailerFound(foundRetailer);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Retailer
          </CardTitle>
          <CardDescription>
            Enter the retailer's mobile number to check if they already exist in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number *</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={searching || loading}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching || loading || !phoneNumber.trim()}
                className="min-w-[100px]"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Found Retailer Display */}
          {foundRetailer && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Retailer found! You can add this existing retailer to your account.
                </AlertDescription>
              </Alert>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">{foundRetailer.name}</h3>
                        <p className="text-sm text-blue-700">Existing Retailer</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">{foundRetailer.phone}</span>
                      </div>
                      
                      {foundRetailer.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-800">{foundRetailer.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Note about area assignment */}
                    <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                      <p>💡 <strong>Note:</strong> This retailer already exists. You can assign service areas specific to your wholesaler network in the next step.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleAddExistingRetailer}
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add This Retailer
                </Button>
              </div>
            </div>
          )}

          {/* No Retailer Found - Add New Option */}
          {error && error.includes('No retailer found') && (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-700">
                  No existing retailer found with this phone number. You can create a new retailer.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={onAddNewRetailer}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Retailer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}