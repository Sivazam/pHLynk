import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
     remotePatterns: [
    {
      protocol: 'https',
      hostname: '**', // This wildcard allows all HTTPS hostnames including Unsplash
    },
    ],
  },
  // Allow development origins for Firebase reCAPTCHA and preview
  allowedDevOrigins: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    'https://0.0.0.0:3000',
    'https://*.space.z.ai',
    'https://preview-chat-d8008d24-a972-4c96-bc70-5e063c8e7ca6.space.z.ai',
    'https://*.z.ai',
    'https://z.ai'
  ],
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/splash.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Generate unique build ID for cache busting
  generateBuildId: async () => {
    return 'pharmalynk-' + Date.now();
  },
  // Webpack configuration to exclude Firebase Functions
  webpack: (config, { dev, isServer, defaultLoaders }) => {
    // Exclude the functions directory from being processed by Next.js
    config.module.rules.push({
      test: /functions\/.*\.(ts|js)$/,
      use: 'ignore-loader'
    });
    
    // Also exclude any Firebase Functions imports
    config.externals = config.externals || [];
    config.externals.push({
      'firebase-functions': 'firebase-functions'
    });
    
    return config;
  },
  // Experimental features for better PWA support
  experimental: {
    optimizeCss: true,
  },
  // Disable caching in development
  ...(process.env.NODE_ENV === 'development' && {
    generateBuildId: async () => {
      return 'dev-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate, max-age=0',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
            {
              key: 'Surrogate-Control',
              value: 'no-store',
            },
          ],
        },
      ];
    },
    // Add webpack configuration for better cache busting
    webpack: (config, { dev }) => {
      if (dev) {
        config.output.filename = 'static/chunks/[name].[contenthash:8].js';
        config.output.chunkFilename = 'static/chunks/[name].[contenthash:8].js';
      }
      return config;
    },
  }),
};

export default nextConfig;
