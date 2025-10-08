import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: '24px' }}>The page you're looking for doesn't exist.</p>
      <Link 
        href="/" 
        style={{ 
          display: 'inline-block', 
          padding: '12px 24px', 
          background: '#0070f3', 
          color: 'white', 
          textDecoration: 'none',
          borderRadius: '6px'
        }}
      >
        Go Home
      </Link>
    </div>
  );
}