'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';

interface WholesalerSliderProps {
  wholesalerNames: { [key: string]: string };
  availableTenants: string[];
  currentTenantId: string | null;
}

export function WholesalerSlider({ 
  wholesalerNames, 
  availableTenants, 
  currentTenantId 
}: WholesalerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log('🏢 WholesalerSlider Debug:', {
      availableTenants,
      availableTenantsLength: availableTenants.length,
      currentTenantId,
      wholesalerNames,
      wholesalerNamesKeys: Object.keys(wholesalerNames)
    });
  }, [availableTenants, currentTenantId, wholesalerNames]);

  useEffect(() => {
    if (availableTenants.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % availableTenants.length);
    }, 3000); // 3000ms = 3 seconds

    return () => clearInterval(interval);
  }, [availableTenants.length]);

  // If no tenants, show nothing
  if (availableTenants.length === 0) {
    console.log('🏢 WholesalerSlider: No tenants available, not rendering');
    return null;
  }

  // If only one tenant, show static content
  if (availableTenants.length === 1) {
    console.log('🏢 WholesalerSlider: One tenant found, showing static content');
    const singleTenantId = availableTenants[0];
    const singleTenantName = wholesalerNames[singleTenantId] || 'Loading...';
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Wholesaler</CardTitle>
          <div className="bg-purple-100 p-2 rounded-full">
            <Store className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {currentTenantId === 'all' ? 'All Wholesalers' : singleTenantName}
            </div>
            <p className="text-xs text-gray-500">
              {currentTenantId === 'all' 
                ? `Consolidated view (${availableTenants.length} wholesalers)` 
                : `Your wholesaler`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentWholesalerId = availableTenants[currentIndex];
  const currentWholesalerName = wholesalerNames[currentWholesalerId] || 'Loading...';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Your Wholesalers</CardTitle>
        <div className="bg-purple-100 p-2 rounded-full">
          <Store className="h-4 w-4 text-purple-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden">
          {/* Slider Container */}
          <div className="flex transition-transform duration-500 ease-in-out">
            <div className="w-full flex-shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {currentWholesalerName}
                </div>
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <span>{currentIndex + 1} of {availableTenants.length}</span>
                  <span>•</span>
                  <span>Auto-scrolling</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slider Indicators */}
          <div className="flex justify-center space-x-1 mt-3">
            {availableTenants.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-purple-600' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to wholesaler ${index + 1}`}
              />
            ))}
          </div>

          {/* Manual Navigation */}
          <div className="flex justify-between items-center mt-2">
            <button
              className="text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + availableTenants.length) % availableTenants.length)}
              disabled={availableTenants.length <= 1}
            >
              ← Previous
            </button>
            <button
              className="text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % availableTenants.length)}
              disabled={availableTenants.length <= 1}
            >
              Next →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}