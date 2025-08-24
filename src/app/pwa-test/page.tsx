'use client';

import { PWATest } from '@/components/PWATest';

export default function PWATestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PWA Test Page</h1>
          <p className="text-gray-600">Test Progressive Web App functionality</p>
        </div>
        <PWATest />
      </div>
    </div>
  );
}