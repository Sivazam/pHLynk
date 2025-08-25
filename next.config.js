/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests from the preview environment
  allowedDevOrigins: [
    'https://preview-chat-4602c3a2-1924-41f1-b907-7cc7edcae7ae.space.z.ai',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  // Configure images for better compatibility
  domains: ['images.unsplash.com', 'localhost'],

  images: {
    remotePatterns: [
    {
      protocol: 'https',
      hostname: '**', // This wildcard allows all HTTPS hostnames including Unsplash
    },
  ]
  },
};

module.exports = nextConfig;