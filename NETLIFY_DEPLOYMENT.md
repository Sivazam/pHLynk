# Netlify Deployment Guide for PharmaLync

## Overview
This guide explains how to deploy the PharmaLync application to Netlify. The application consists of:
- Next.js frontend (deployed to Netlify)
- Firebase Functions (deployed separately to Firebase)

## Prerequisites

### System Requirements
- Node.js 20 or higher
- npm 10 or higher
- Git

### Required Accounts
- Netlify account
- Firebase account (for Functions)
- Fast2SMS account (for SMS notifications)

## Deployment Steps

### 1. Prepare the Project

The project has been configured for Netlify deployment with:
- Updated TypeScript version (5.6.3) to resolve dependency conflicts
- Netlify configuration file (`netlify.toml`)
- npm configuration file (`.npmrc`)
- Build scripts optimized for Netlify

### 2. Local Build Test

Before deploying, test the build locally:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build the project
npm run build:netlify
```

### 3. Deploy to Netlify

#### Option A: Using Netlify CLI (Recommended)

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy to Netlify:
```bash
netlify deploy --prod
```

#### Option B: Using Git Repository

1. Push your code to GitHub, GitLab, or Bitbucket
2. Connect your repository to Netlify
3. Netlify will automatically detect and deploy your project

### 4. Configure Environment Variables

In the Netlify dashboard, set the following environment variables:

#### Required Variables
```bash
# Fast2SMS Configuration
FAST2SMS_API_KEY=your_fast2sms_api_key
RETAILER_DLT_TEMPLATE_ID=1707175912558362799
WHOLESALER_DLT_TEMPLATE_ID=1707175912581282302

# Firebase Configuration
FIREBASE_CONFIG='{"apiKey":"your_api_key","authDomain":"your_auth_domain","projectId":"your_project_id","storageBucket":"your_storage_bucket","messagingSenderId":"your_messaging_sender_id","appId":"your_app_id"}'

# Database Configuration
DATABASE_URL=file:./db/custom.db
```

#### Optional Variables
```bash
# Development/Production Mode
NODE_ENV=production

# Logging
NEXT_TELEMETRY_DISABLED=1
```

### 5. Deploy Firebase Functions (Separately)

The Firebase Functions need to be deployed separately:

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy to Firebase
firebase deploy --only functions
```

## Configuration Files

### netlify.toml
```toml
[build]
  command = "npm run build:netlify"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"
  NPM_FLAGS = "--legacy-peer-deps"
  NEXT_TELEMETRY_DISABLED = "1"

# Plugin to handle Next.js build
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Redirect rules for Next.js
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for better security and caching
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
```

### .npmrc
```bash
legacy-peer-deps=true
fund=false
audit-level=moderate
```

## Troubleshooting

### Common Issues

#### 1. TypeScript Version Conflict
**Error**: `ERESOLVE could not resolve`
**Solution**: The project now uses TypeScript 5.6.3 which is compatible with @prisma/client

#### 2. Build Failures
**Error**: Build fails during dependency installation
**Solution**: Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

#### 3. Missing Environment Variables
**Error**: Application not working after deployment
**Solution**: Ensure all required environment variables are set in Netlify dashboard

#### 4. API Routes Not Working
**Error**: API routes returning 404
**Solution**: Check that the `netlify.toml` is properly configured and the build includes API routes

### Debug Commands

```bash
# Check build locally
npm run build:netlify

# Check linting
npm run lint

# Test with Netlify CLI locally
netlify dev
```

## Architecture Overview

```
PharmaLync Application
├── Next.js Frontend (Netlify)
│   ├── Static Assets
│   ├── API Routes (Serverless Functions)
│   └── Client-side Application
├── Firebase Functions (Firebase)
│   ├── SMS Notifications
│   ├── Payment Processing
│   └── Background Jobs
└── External Services
    ├── Fast2SMS (SMS Gateway)
    ├── Firebase Firestore (Database)
    └── Firebase Authentication
```

## Post-Deployment Checklist

- [ ] Verify the application loads correctly
- [ ] Test user authentication
- [ ] Test payment collection flow
- [ ] Verify SMS notifications are working
- [ ] Check all API routes are functional
- [ ] Verify environment variables are properly set
- [ ] Test mobile responsiveness
- [ ] Check error handling and logging

## Support

If you encounter any issues during deployment:

1. Check the Netlify build logs
2. Verify all environment variables are set
3. Ensure Firebase Functions are deployed separately
4. Test the application locally first
5. Check the browser console for JavaScript errors

For additional support, refer to the Netlify documentation or contact the development team.