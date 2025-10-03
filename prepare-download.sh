#!/bin/bash

# Script to prepare project for download without node_modules
# This creates a clean archive under 5MB

echo "🗂️  Preparing project for download..."

# Create a temporary directory
TEMP_DIR="/tmp/pharmalync-project"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy all files except node_modules and build artifacts
echo "📋 Copying project files..."
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='dev.log' \
  --exclude='server.log' \
  --exclude='functions/node_modules' \
  --exclude='functions/.next' \
  --exclude='functions/lib' \
  --exclude='*.tgz' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='coverage' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='.env.development' \
  ./ "$TEMP_DIR/"

# Clean up any remaining large files
echo "🧹 Cleaning up large files..."
find "$TEMP_DIR" -name "*.db" -exec rm -f {} \;
find "$TEMP_DIR" -name "*.sqlite" -exec rm -f {} \;
find "$TEMP_DIR" -name "*.sqlite3" -exec rm -f {} \;

# Create archive
echo "📦 Creating archive..."
cd /tmp
tar -czf pharmalync-project.tar.gz pharmalync-project/

# Check file size
FILE_SIZE=$(stat -c%s "pharmalync-project.tar.gz")
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))

echo "✅ Archive created: pharmalync-project.tar.gz"
echo "📊 File size: ${FILE_SIZE_MB}MB"

if [ $FILE_SIZE_MB -gt 5 ]; then
    echo "⚠️  Warning: File is larger than 5MB (${FILE_SIZE_MB}MB)"
    echo "🔍 Finding large files..."
    find "$TEMP_DIR" -type f -exec ls -lh {} \; | sort -k5 -hr | head -10
else
    echo "✅ File size is under 5MB limit"
fi

# Move to project directory
mv pharmalync-project.tar.gz /home/z/my-project/

# Clean up
rm -rf "$TEMP_DIR"

echo "🎉 Project ready for download: pharmalync-project.tar.gz"