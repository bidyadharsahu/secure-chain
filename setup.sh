#!/bin/bash
# SecureChainPay Setup Script for macOS/Linux
# This script helps you set up the SecureChainPay project

echo "================================================"
echo "   SecureChainPay Setup Wizard"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is installed
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm is not installed!${NC}"
    exit 1
fi

echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install dependencies!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Please edit .env file with your configuration!${NC}"
    echo -e "${YELLOW}   See ENV_GUIDE.md for detailed instructions${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}   Setup Complete!${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Deploy smart contracts (see contracts/README.md)"
echo "2. Set up Supabase (see supabase/README.md)"
echo "3. Configure .env file (see ENV_GUIDE.md)"
echo "4. Run 'npm run dev' to start the application"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "- README.md - Main documentation"
echo "- SETUP_CHECKLIST.md - Quick setup guide"
echo "- GET_STARTED.md - Complete getting started guide"
echo ""
echo -e "${CYAN}Happy coding! 🚀${NC}"
