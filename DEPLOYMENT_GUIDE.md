# Deployment Guide for PharmaLync

## 🚀 Complete Deployment Process

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project created
3. Node.js 18+ installed

### Step 1: Firebase Project Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase project (if not already done)
firebase init

# Select:
# - Functions: Enable
# - Hosting: Enable
# - Firestore: Enable
# - Storage: Enable

# Use existing project or create new one
```

### Step 2: Environment Variables Configuration
```bash
# Copy the production environment template
cp .env.production .env

# Edit .env file with your actual values
nano .env
```

**Required Environment Variables:**
- `FAST2SMS_API_KEY`: Your Fast2SMS API key
- `ENTITY_ID`: Your DLT entity ID
- `NEXTAUTH_SECRET`: A random secret string
- `NEXTAUTH_URL`: Your deployed URL

### Step 3: Build Next.js Application
```bash
# Install dependencies
npm install

# Build the application
npm run build

# The build output will be in the .next folder
```

### Step 4: Deploy Firebase Functions (Backend)
```bash
# Navigate to functions directory
cd functions

# Install function dependencies
npm install

# Build functions
npm run build

# Deploy functions
cd ..
firebase deploy --only functions
```

### Step 5: Deploy Firestore Security Rules and Indexes
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### Step 6: Deploy Storage Rules
```bash
# Deploy Storage rules
firebase deploy --only storage
```

### Step 7: Deploy Next.js Frontend
There are two options for deploying the Next.js frontend:

#### Option A: Firebase Hosting (Recommended)
```bash
# Install Firebase hosting dependencies
npm install -g firebase-tools

# Build the Next.js app for static export
npm run build

# Copy built files to Firebase hosting public directory
cp -r .next/static/* public/
cp -r .next/server/* public/

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Option B: Vercel (Alternative)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Follow the prompts to configure environment variables
```

### Step 8: Configure Firebase Authentication
1. Go to Firebase Console
2. Navigate to Authentication → Sign-in method
3. Enable Email/Password provider
4. Configure authorized domains (your deployed URL)

### Step 9: Test Deployed Application
```bash
# Open deployed application
firebase open hosting:site

# Test all functionality:
# - User registration and login
# - Payment collection flow
# - OTP generation and verification
# - SMS notifications (if Fast2SMS configured)
# - Admin dashboards
```

### Step 10: Set Up Monitoring
```bash
# Set up Firebase Crashlytics (optional)
firebase deploy --only crashlytics

# Set up Firebase Performance Monitoring (optional)
firebase deploy --only performance
```

## 📋 Post-Deployment Checklist

### ✅ Security Configuration
- [ ] Firestore security rules deployed
- [ ] Storage rules deployed
- [ ] Environment variables set in production
- [ ] Firebase Authentication configured
- [ ] API keys secured (not exposed in frontend)

### ✅ Functionality Testing
- [ ] User authentication works
- [ ] Role-based access control works
- [ ] Payment collection flow works
- [ ] OTP generation and verification works
- [ ] SMS notifications work (if configured)
- [ ] Admin dashboards work
- [ ] Data persistence works

### ✅ Performance & Monitoring
- [ ] Application loads correctly
- [ ] No console errors
- [ ] Firebase Functions execute properly
- [ ] Firestore queries perform well
- [ ] Error tracking set up

## 🔧 Troubleshooting

### Common Issues

1. **Functions Deployment Fails**
   ```bash
   # Check functions logs
   firebase functions:log
   
   # Check Node.js version (must be 18+)
   node --version
   ```

2. **Frontend Build Fails**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

3. **Environment Variables Not Working**
   ```bash
   # Verify .env file exists and has correct values
   cat .env
   
   # Check Firebase Functions environment
   firebase functions:config:get
   ```

4. **Firestore Rules Not Applied**
   ```bash
   # Redeploy rules
   firebase deploy --only firestore:rules
   ```

## 📝 Production Notes

### Security
- All API keys are stored in environment variables
- Firebase web app key is intentionally public (standard practice)
- Firestore security rules enforce data access
- Authentication is required for all operations

### Performance
- Next.js static generation for optimal performance
- Firebase Functions scale automatically
- Firestore indexes optimized for query performance

### Monitoring
- Firebase Console provides real-time monitoring
- Functions logs available in Firebase Console
- Crashlytics for error tracking (optional)
- Performance Monitoring for app performance (optional)

## 🔄 Continuous Deployment

For automated deployment, consider setting up CI/CD:

### GitHub Actions Example
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build Next.js app
        run: npm run build
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```