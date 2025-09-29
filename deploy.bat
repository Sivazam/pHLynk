@echo off
REM PharmaLync Deployment Script for Windows
REM This script automates the deployment process

echo 🚀 Starting PharmaLync deployment...

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Firebase CLI is not installed. Please run: npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from template...
    if exist ".env.production" (
        copy .env.production .env
        echo [WARNING] Please edit .env file with your actual values before continuing
        echo [WARNING] Required variables: FAST2SMS_API_KEY, ENTITY_ID, NEXTAUTH_SECRET, NEXTAUTH_URL
        pause
    ) else (
        echo [ERROR] .env.production template not found. Please create .env file manually.
        pause
        exit /b 1
    )
)

REM Step 1: Install dependencies
echo [INFO] Installing dependencies...
npm install

REM Step 2: Install functions dependencies
echo [INFO] Installing functions dependencies...
cd functions
npm install
cd ..

REM Step 3: Build Next.js application
echo [INFO] Building Next.js application...
npm run build

REM Step 4: Build Firebase Functions
echo [INFO] Building Firebase Functions...
cd functions
npm run build
cd ..

REM Step 5: Deploy Firebase Functions
echo [INFO] Deploying Firebase Functions...
firebase deploy --only functions

REM Step 6: Deploy Firestore security rules
echo [INFO] Deploying Firestore security rules...
firebase deploy --only firestore:rules

REM Step 7: Deploy Firestore indexes
echo [INFO] Deploying Firestore indexes...
firebase deploy --only firestore:indexes

REM Step 8: Deploy Storage rules
echo [INFO] Deploying Storage rules...
firebase deploy --only storage

REM Step 9: Prepare static files for hosting
echo [INFO] Preparing static files for hosting...
if not exist "public\_next" mkdir public\_next
xcopy /E /I /Y .next\static\* public\_next\
xcopy /E /I /Y .next\server\pages\* public\ 2>nul || echo No server pages found
xcopy /E /I /Y out\* public\ 2>nul || echo No out directory found

REM Step 10: Deploy to Firebase Hosting
echo [INFO] Deploying to Firebase Hosting...
firebase deploy --only hosting

echo.
echo 🎉 Deployment completed successfully!
echo [INFO] Your application is deployed successfully!

echo.
echo [INFO] Post-deployment checklist:
echo   ✅ Firebase Functions deployed
echo   ✅ Firestore security rules deployed
echo   ✅ Firestore indexes deployed
echo   ✅ Storage rules deployed
echo   ✅ Next.js frontend deployed
echo.
echo [WARNING] Please complete the following manual steps:
echo   1. Configure Firebase Authentication in Firebase Console
echo   2. Set up authorized domains in Authentication
echo   3. Test all functionality
echo   4. Set up monitoring if needed
echo.
echo [INFO] To view logs, run: firebase functions:log
echo [INFO] To open deployed site, run: firebase open hosting:site

pause