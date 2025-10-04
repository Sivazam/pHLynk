'use client';

import { useState, useEffect } from 'react';
import { initializeFCM } from '@/lib/fcm';
import { auth } from '@/lib/firebase';

export default function FCMTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const testFCMRegistration = async () => {
    setIsLoading(true);
    setLogs([]);
    
    try {
      addLog('🧪 Starting FCM registration test...');
      
      // Check current user
      if (!auth.currentUser) {
        addLog('❌ No authenticated user found');
        setIsLoading(false);
        return;
      }
      
      addLog(`✅ Current user: ${auth.currentUser.uid}`);
      addLog(`📱 Phone: ${auth.currentUser.phoneNumber || 'N/A'}`);
      addLog(`📧 Email: ${auth.currentUser.email || 'N/A'}`);

      // Test FCM initialization
      addLog('🔔 Initializing FCM...');
      const token = await initializeFCM();
      
      if (token) {
        addLog(`✅ FCM token obtained: ${token.substring(0, 30)}...`);
        
        // Test manual API call
        addLog('📡 Testing manual API call...');
        const response = await fetch('/api/fcm/register-device', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retailerId: 'test-retailer-123',
            deviceToken: token,
            userAgent: navigator.userAgent,
            isNewUser: false,
            timestamp: new Date().toISOString()
          })
        });

        if (response.ok) {
          const result = await response.json();
          addLog(`✅ API call successful: ${JSON.stringify(result)}`);
        } else {
          const error = await response.json();
          addLog(`❌ API call failed: ${JSON.stringify(error)}`);
        }
      } else {
        addLog('❌ Failed to get FCM token');
      }
      
    } catch (error) {
      addLog(`❌ Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">FCM Registration Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={testFCMRegistration}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : 'Test FCM Registration'}
            </button>
            <button
              onClick={clearLogs}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Test FCM Registration" to start...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Make sure you are logged in as a retailer user</li>
            <li>Click "Test FCM Registration" to start the test</li>
            <li>Watch the logs for detailed information about the FCM registration process</li>
            <li>Check the browser console and server logs for additional debugging information</li>
          </ol>
        </div>
      </div>
    </div>
  );
}