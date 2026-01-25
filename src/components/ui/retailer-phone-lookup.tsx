'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, Phone, MapPin, Plus, CheckCircle, BookUser } from 'lucide-react';
import { Retailer } from '@/types';
import { normalizePhoneNumber } from '@/lib/utils';

interface RetailerPhoneLookupProps {
  onRetailerFound: (retailer: Retailer) => void;
  onAddNewRetailer: (searchedPhone: string) => void; // Now passes the phone number
  onCancel: () => void;
  loading?: boolean;
  existingRetailers?: Retailer[]; // Retailers already in wholesaler's network
}

// Type definition for Web Contacts API
interface ContactAddress {
  city?: string;
  country?: string;
  postalCode?: string;
  region?: string;
  streetAddress?: string;
}

interface ContactInfo {
  name?: string[];
  email?: string[];
  tel?: string[];
  address?: ContactAddress[];
}

// Extend Navigator interface for contacts API
declare global {
  interface Navigator {
    contacts?: {
      select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactInfo[]>;
    };
  }
}

export function RetailerPhoneLookup({
  onRetailerFound,
  onAddNewRetailer,
  onCancel,
  loading = false,
  existingRetailers = []
}: RetailerPhoneLookupProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundRetailer, setFoundRetailer] = useState<Retailer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [isAlreadyInNetwork, setIsAlreadyInNetwork] = useState(false);

  // Check if Contacts API is supported
  useEffect(() => {
    // Contacts API is only available in secure contexts and on supported browsers
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'select' in (navigator.contacts || {})) {
      setContactsSupported(true);
    }
  }, []);

  const handlePickContact = async () => {
    if (!navigator.contacts) {
      setError('Contacts access is not supported on this device/browser.');
      return;
    }

    try {
      const contacts = await navigator.contacts.select(['tel'], { multiple: false });

      if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
        const rawPhone = contacts[0].tel[0];
        const normalized = normalizePhoneNumber(rawPhone);

        if (normalized.length === 10) {
          setPhoneNumber(normalized);
          setError(null);
          // Auto-trigger search after picking contact
          handleSearchWithPhone(normalized);
        } else {
          setPhoneNumber(rawPhone);
          setError('The selected phone number appears invalid. Please verify.');
        }
      }
    } catch (err: any) {
      // User cancelled or permission denied
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        console.error('Error picking contact:', err);
        setError('Could not access contacts. Please enter the number manually.');
      }
    }
  };

  const handleSearchWithPhone = async (phone: string) => {
    const cleanPhone = normalizePhoneNumber(phone);

    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
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

        // Check if this retailer is already in the wholesaler's network
        const alreadyExists = existingRetailers.some(r => r.id === data.retailer.id);
        setIsAlreadyInNetwork(alreadyExists);
        if (alreadyExists) {
          console.log('⚠️ Retailer is already in network');
        }
      } else {
        console.log('ℹ️ No retailer found with this phone number');
        setError('No retailer found with this phone number');
        setIsAlreadyInNetwork(false);
      }
    } catch (error) {
      console.error('❌ Error searching retailer:', error);
      setError(error instanceof Error ? error.message : 'Failed to search retailer');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }
    await handleSearchWithPhone(phoneNumber);
  };

  const handleAddExistingRetailer = () => {
    if (foundRetailer) {
      onRetailerFound(foundRetailer);
    }
  };

  const handleCreateNew = () => {
    // Pass the normalized phone number to the parent
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    onAddNewRetailer(normalizedPhone);
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
        {/* <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Retailer
          </CardTitle>
          <CardDescription>
            Enter the retailer's mobile number to check if they already exist in the system
          </CardDescription>
        </CardHeader> */}
        <CardContent className="space-y-4">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number *</Label>
            <div className="flex gap-2">
              {/* Pick from Contacts Button - Only show if supported */}
              {contactsSupported && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handlePickContact}
                  disabled={searching || loading}
                  title="Pick from Contacts"
                  className="shrink-0"
                >
                  <BookUser className="w-4 h-4" />
                </Button>
              )}
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
            {contactsSupported && (
              <p className="text-xs text-muted-foreground">
                Tip: Use the <BookUser className="inline w-3 h-3" /> button to pick a contact from your phone.
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && !error.includes('No retailer found') && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Found Retailer Display */}
          {foundRetailer && (
            <div className="space-y-4">
              {/* Different alert based on whether already in network */}
              {isAlreadyInNetwork ? (
                <Alert className="border-amber-200 bg-amber-50">
                  <CheckCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    This retailer is already in your network!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Retailer found! You can add this existing retailer to your account.
                  </AlertDescription>
                </Alert>
              )}

              <Card className={isAlreadyInNetwork ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAlreadyInNetwork ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        <User className={`w-6 h-6 ${isAlreadyInNetwork ? 'text-amber-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isAlreadyInNetwork ? 'text-amber-900' : 'text-blue-900'}`}>{foundRetailer.name}</h3>
                        <p className={`text-sm ${isAlreadyInNetwork ? 'text-amber-700' : 'text-blue-700'}`}>
                          {isAlreadyInNetwork ? 'Already in Your Network' : 'Existing Retailer'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className={`w-4 h-4 ${isAlreadyInNetwork ? 'text-amber-600' : 'text-blue-600'}`} />
                        <span className={`text-sm ${isAlreadyInNetwork ? 'text-amber-800' : 'text-blue-800'}`}>{foundRetailer.phone}</span>
                      </div>

                      {foundRetailer.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className={`w-4 h-4 ${isAlreadyInNetwork ? 'text-amber-600' : 'text-blue-600'}`} />
                          <span className={`text-sm ${isAlreadyInNetwork ? 'text-amber-800' : 'text-blue-800'}`}>{foundRetailer.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div className={`text-xs p-2 rounded ${isAlreadyInNetwork ? 'text-amber-600 bg-amber-100' : 'text-blue-600 bg-blue-100'}`}>
                      <p>
                        {isAlreadyInNetwork
                          ? '✓ This retailer is already part of your wholesaler network. You can manage their service areas from the Retailers tab.'
                          : '💡 This retailer already exists. You can assign service areas specific to your wholesaler network in the next step.'
                        }
                      </p>
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
                  {isAlreadyInNetwork ? 'Close' : 'Cancel'}
                </Button>
                {!isAlreadyInNetwork && (
                  <Button
                    type="button"
                    onClick={handleAddExistingRetailer}
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add This Retailer
                  </Button>
                )}
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
                  onClick={handleCreateNew}
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