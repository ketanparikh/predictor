#!/bin/bash

# Firebase Deployment Script for Cricket Predictor App
# This script builds and deploys all components to Firebase

echo "========================================"
echo "  Cricket Predictor - Deployment Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
echo -e "${YELLOW}[1/5] Checking Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}✗ Firebase CLI not found. Please install it first.${NC}"
    echo -e "${YELLOW}  Install via: npm install -g firebase-tools${NC}"
    exit 1
fi
FIREBASE_VERSION=$(firebase --version)
echo -e "${GREEN}✓ Firebase CLI found: $FIREBASE_VERSION${NC}"

# Check if Flutter is installed
echo -e "${YELLOW}[2/5] Checking Flutter...${NC}"
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}✗ Flutter not found. Please install Flutter first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Flutter found${NC}"

# Build Cloud Functions
echo -e "${YELLOW}[3/5] Building Cloud Functions...${NC}"
cd functions || exit 1
if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install
fi
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to build Cloud Functions${NC}"
    cd ..
    exit 1
fi
echo -e "${GREEN}✓ Cloud Functions built successfully${NC}"
cd ..

# Build Flutter Web App
echo -e "${YELLOW}[4/5] Building Flutter Web App...${NC}"
flutter build web
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to build Flutter web app${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Flutter web app built successfully${NC}"

# Deploy to Firebase
echo -e "${YELLOW}[5/5] Deploying to Firebase...${NC}"
echo ""
firebase deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Access your app at: https://predictor-jcpl.web.app${NC}"
echo -e "${CYAN}Firebase Console: https://console.firebase.google.com/project/predictor-jcpl/overview${NC}"
echo ""

