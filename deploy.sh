#!/bin/bash

# PharmaLync Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting PharmaLync deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please run: npm install -g firebase-tools"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f ".env.production" ]; then
        cp .env.production .env
        print_warning "Please edit .env file with your actual values before continuing"
        print_warning "Required variables: FAST2SMS_API_KEY, ENTITY_ID, NEXTAUTH_SECRET, NEXTAUTH_URL"
        read -p "Press Enter after editing .env file..."
    else
        print_error ".env.production template not found. Please create .env file manually."
        exit 1
    fi
fi

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm install

# Step 2: Install functions dependencies
print_status "Installing functions dependencies..."
cd functions
npm install
cd ..

# Step 3: Build Next.js application
print_status "Building Next.js application..."
npm run build

# Step 4: Build Firebase Functions
print_status "Building Firebase Functions..."
cd functions
npm run build
cd ..

# Step 5: Deploy Firebase Functions
print_status "Deploying Firebase Functions..."
firebase deploy --only functions

# Step 6: Deploy Firestore security rules
print_status "Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Step 7: Deploy Firestore indexes
print_status "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

# Step 8: Deploy Storage rules
print_status "Deploying Storage rules..."
firebase deploy --only storage

# Step 9: Prepare static files for hosting
print_status "Preparing static files for hosting..."
mkdir -p public/_next
cp -r .next/static/* public/_next/
cp -r .next/server/pages/* public/ 2>/dev/null || true
cp -r out/* public/ 2>/dev/null || true

# Step 10: Deploy to Firebase Hosting
print_status "Deploying to Firebase Hosting..."
firebase deploy --only hosting

# Step 11: Get the deployed URL
DEPLOYED_URL=$(firebase hosting:channel:list | grep "live" | head -1 | awk '{print $3}' || echo "https://your-project.web.app")

print_status "🎉 Deployment completed successfully!"
print_status "Your application is deployed at: $DEPLOYED_URL"

# Step 12: Post-deployment checklist
echo ""
print_status "Post-deployment checklist:"
echo "  ✅ Firebase Functions deployed"
echo "  ✅ Firestore security rules deployed"
echo "  ✅ Firestore indexes deployed"
echo "  ✅ Storage rules deployed"
echo "  ✅ Next.js frontend deployed"
echo ""
print_warning "Please complete the following manual steps:"
echo "  1. Configure Firebase Authentication in Firebase Console"
echo "  2. Set up authorized domains in Authentication"
echo "  3. Test all functionality"
echo "  4. Set up monitoring if needed"
echo ""
print_status "To view logs, run: firebase functions:log"
print_status "To open deployed site, run: firebase open hosting:site"