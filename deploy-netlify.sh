#!/bin/bash

# Netlify Deployment Script for PharmaLync
echo "🚀 Starting Netlify deployment process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Build the project
echo "🔨 Building the project..."
npm run build:netlify

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📥 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

echo "✅ Netlify CLI is ready"

# Instructions for manual deployment
echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "To deploy to Netlify, you have two options:"
echo ""
echo "Option 1: Using Netlify CLI (recommended)"
echo "  1. Run: netlify login"
echo "  2. Run: netlify deploy --prod"
echo ""
echo "Option 2: Using Netlify dashboard"
echo "  1. Push your code to GitHub/GitLab/Bitbucket"
echo "  2. Connect your repository to Netlify"
echo "  3. Netlify will automatically detect and deploy your project"
echo ""
echo "📋 Important notes:"
echo "  - Make sure to set environment variables in Netlify dashboard:"
echo "    * FAST2SMS_API_KEY"
echo "    * RETAILER_DLT_TEMPLATE_ID"
echo "    * WHOLESALER_DLT_TEMPLATE_ID"
echo "    * FIREBASE_CONFIG"
echo "    * DATABASE_URL"
echo ""
echo "  - The project will be deployed as a static site with API routes"
echo "  - Firebase Functions should be deployed separately"