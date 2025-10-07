'use client';

import dynamic from 'next/dynamic';

// Dynamically import HomeContent to avoid webpack issues
const HomeContent = dynamic(() => import('./HomeContent'), {
  ssr: false
});

export default function Home() {
  return <HomeContent />;
}