'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function FCMTokenLookupPage() {
  const [retailerId, setRetailerId] = useState('AEGT44cVpaORM6k30r5K');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testTokenLookup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/debug/fcm-token-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailerId })
      });

      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(data.error || 'Failed to lookup FCM token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDirectFCM = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/debug/send-direct-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId,
          otp: 'TEST123',
          amount: 100,
          paymentId: 'test-payment-' + Date.now(),
          lineWorkerName: 'Test Line Worker'
        })
      });

      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(data.error || 'Failed to send direct FCM');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Smartphone className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">FCM Token Debug Tool</h1>
          <p className="text-muted-foreground">Test FCM token lookup and direct notification sending</p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Retailer ID Input</CardTitle>
          <CardDescription>Enter the retailer ID to test FCM token lookup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Retailer ID</label>
              <Input
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                placeholder="Enter retailer ID"
              />
            </div>
            <Button 
              onClick={testTokenLookup} 
              disabled={loading || !retailerId}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Lookup Token
            </Button>
            <Button 
              onClick={testDirectFCM} 
              disabled={loading || !retailerId}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Test Direct FCM
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'Success' : 'Failed'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Collection: {result.collection || 'Unknown'}
                </span>
              </div>

              {/* Message */}
              {result.message && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">{result.message}</p>
                </div>
              )}

              {/* Retailer Info */}
              {result.retailerName && (
                <div>
                  <h4 className="font-medium mb-2">Retailer Information</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm"><strong>Name:</strong> {result.retailerName}</p>
                    <p className="text-sm"><strong>ID:</strong> {result.retailerId}</p>
                  </div>
                </div>
              )}

              {/* FCM Devices */}
              {result.fcmDevices && result.fcmDevices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">FCM Devices ({result.fcmDevices.length})</h4>
                  <div className="space-y-2">
                    {result.fcmDevices.map((device: any, index: number) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={device.isActive ? 'default' : 'secondary'}>
                            {device.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Device {index + 1}
                          </span>
                        </div>
                        <p className="text-sm font-mono">{device.tokenPrefix}</p>
                        {device.lastActive && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last Active: {new Date(device.lastActive).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Found Devices (for direct FCM test) */}
              {result.foundDevices !== undefined && (
                <div>
                  <h4 className="font-medium mb-2">Device Search Results</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm"><strong>Devices Found:</strong> {result.foundDevices}</p>
                    {result.devices && result.devices.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {result.devices.map((device: any, index: number) => (
                          <div key={index} className="text-xs p-2 bg-white rounded border">
                            <p><strong>Device:</strong> {device.deviceId}</p>
                            <p><strong>Token:</strong> {device.tokenPrefix}</p>
                            <p><strong>Status:</strong> {device.isActive ? 'Active' : 'Inactive'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Debug Info */}
              <div>
                <h4 className="font-medium mb-2">Debug Information</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}