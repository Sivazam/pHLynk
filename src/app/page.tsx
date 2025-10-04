'use client';

import { Suspense } from 'react';
import { HomeContent } from './HomeContent';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function Home() {
  return (
    <Suspense fallback={<AppLoadingScreen progress={0} stage="Loading..." />}>
      <HomeContent />
    </Suspense>
  );
}