# Changelog

All notable changes to the AWS Cybersecurity Workshop application will be documented in this file.

## [1.2.1] - 2026-01-05 - Internet Gateway Validation Fixes

### 🐛 Fixed
- **Internet Gateway Validation**: Fixed attachment state validation to accept "available" as a valid state
  - AWS returns "available" state for properly attached Internet Gateways, not just "attached"
  - Added type casting to handle AWS API response variations
- **NAT Gateway Route Detection**: Fixed subnet classification logic for three-tier architecture
  - Removed unnecessary `.startsWith('nat-')` check that was preventing proper NAT Gateway route detection
  - Improved subnet tier classification (public/private/internal) based on actual routing configuration
- **Route Table Analysis**: Enhanced reliability of network tier validation
  - Fixed edge cases in route analysis where valid configurations were incorrectly flagged as failures

### 🔧 Technical
- Updated `validateInternetGateway` function to handle AWS API state variations
- Improved `classifySubnetByRoutes` function for more accurate subnet tier detection
- Enhanced error messaging for Internet Gateway validation failures

## [1.2.0] - 2026-01-05 - S3 Web Bucket Validation Implementation

### ✨ Added
- **Complete S3 Web Bucket Validation**: Second fully functional exercise with comprehensive security checks
  - Static website hosting configuration validation using GetBucketWebsiteCommand
  - Real public accessibility testing with detailed permission analysis
  - Bucket policy and ACL analysis for s3:GetObject permissions
  - Controlled access validation (prevents excessive write permissions)
  - Integration with existing bucket discovery patterns using tags (proyecto=cybersec, funcion=web)
- **Enhanced Security Analysis**:
  - Separate validation for bucket policies vs ACL-based public access
  - Detection of excessive permissions (write, full control) while allowing required read access
  - Public Access Block configuration analysis for web hosting compatibility
  - Detailed feedback on why public access may or may not be working

### 🐛 Fixed
- **TypeScript Compilation**: Fixed unused parameter warnings in server routes
- **Public Access Logic**: Corrected false positive where web bucket validation assumed public access without verifying actual permissions
- **Validation Accuracy**: Improved detection of missing s3:GetObject permissions for proper website functionality

### 🔧 Technical
- Added `GetBucketWebsiteCommand` and `HeadObjectCommand` to S3 client imports
- Enhanced `checkIndexFile` function with real public access verification
- Improved `checkControlledAccess` function with better permission analysis
- New `checkPublicReadAccess` helper function for comprehensive access validation

## [1.1.0] - 2026-01-04 - S3 Data Bucket Validation Implementation

### ✨ Added
- **Complete S3 Data Bucket Validation**: First fully functional exercise with real AWS integration
  - Automatic bucket discovery using ListBuckets and GetBucketTagging APIs
  - Comprehensive security validation including Block Public Access settings
  - Real file download and content validation for pokemon.csv
  - Detailed test results with pass/fail/warning status for each security check
- **Enhanced Security Checks**:
  - Block Public Access configuration validation (all 4 settings)
  - Bucket policy analysis for public principals
  - Bucket ACL scanning for public grants
  - Bucket policy status verification
- **Improved UI**:
  - Collapsible detailed test results with individual test status
  - Enhanced test condition display with icons and color coding
  - Better error messages and remediation guidance
- **Enhanced Type System**:
  - `TestCondition` interface for structured test results
  - Updated `ExerciseResult` with `testResults` array
  - Better validation result structures

### 🐛 Fixed
- **Vite Proxy Configuration**: Fixed API proxy to point to correct backend port (3002)
- **Credential Storage**: Added session-based credential storage for exercise validation
- **Bucket Discovery**: Replaced pattern-based guessing with proper tag-based bucket discovery

### 🔧 Technical Improvements
- Added comprehensive S3 API integration (ListBuckets, GetBucketTagging, GetPublicAccessBlock)
- Implemented real file download with content validation
- Enhanced error handling and detailed feedback
- Structured validation pipeline with individual test tracking

## [0.2.0] - 2026-01-04 - AWS Integration & Credentials Management

### ✨ Added
- **AWS SDK Integration**: Added AWS SDK packages for STS, IAM, S3, EC2, RDS, and Elastic Load Balancing v2
- **Credentials Management**: 
  - New credentials input screen with INI format parser
  - Real-time AWS credential validation using STS GetCallerIdentity
  - Account information display (Account ID, ARN, User ID, Region, User Name)
- **Enhanced Type System**:
  - `AWSCredentials` interface for credential handling
  - `AWSAccountInfo` interface for account details
  - `CredentialsValidationResult` interface for validation responses
  - Extended `Exercise` interface with points system and new categories (vpc, lb)
- **New API Endpoints**:
  - `POST /api/credentials/validate` - Validates AWS credentials and returns account info
- **Updated Exercise Structure**:
  - Replaced generic exercises with 9 workshop-specific exercises
  - Each exercise now shows point values (1-2 points as per workshop requirements)
  - New exercise categories: S3, VPC, EC2, RDS, Load Balancer
- **Enhanced UI Components**:
  - Credentials setup screen with INI format example
  - Account information display with validation status
  - Enhanced exercise cards with point indicators
  - Error handling and loading states

### 🔧 Changed
- **Authentication Flow**: Application now requires AWS credentials before showing exercises
- **Frontend Architecture**: Split UI into authenticated and non-authenticated states
- **Exercise Categories**: Updated from generic categories to workshop-specific ones
- **Server Configuration**: 
  - Changed default port from 3001 to 3002
  - Added credentials route integration
- **Vite Configuration**: Added host binding to '0.0.0.0' for external access

### 📋 Workshop Exercises Implemented
1. **S3 Data Bucket Security** (1 point) - Verify pokemon.csv access control
2. **S3 Web Bucket Configuration** (1 point) - Validate public hosting setup
3. **VPC Network Design** (1 point) - Check CIDR and subnet segmentation
4. **Network Route Tables** (2 points) - Verify traffic control between tiers
5. **Security Groups Microsegmentation** (1 point) - Validate albsg, appsg, bdsg
6. **RDS Database Protection** (1 point) - Check PostgreSQL Multi-AZ in internal subnets
7. **Application Load Balancer** (1 point) - Validate ALB and target group config
8. **Launch Template Security** (1 point) - Verify secure template with IAM role
9. **Auto Scaling Group** (1 point) - Check ASG in private subnets

### 🎯 Features Ready for Testing
- ✅ AWS credential parsing from INI format
- ✅ Real AWS account validation and information extraction
- ✅ Responsive UI with proper error handling
- ✅ Exercise structure matching workshop requirements
- ✅ Development server accessible externally on port 5175

### 🚧 Next Steps
- Implement actual AWS validation logic for each exercise
- Add AWS resource checking functions (S3, VPC, Security Groups, etc.)
- Create comprehensive error handling for AWS API calls
- Add progress tracking and scoring system

---

## [0.1.0] - 2026-01-04 - Initial Project Setup

### ✨ Added
- **Base Project Structure**: TypeScript full-stack application setup
- **Frontend**: React with Mantine UI components
- **Backend**: Express.js server with TypeScript
- **Development Environment**: 
  - Vite for frontend development
  - tsx for TypeScript server development
  - Concurrently for running both client and server
- **Basic Features**:
  - Sample cybersecurity exercises UI
  - Express API with exercise routes
  - TypeScript type definitions
  - Basic project configuration files

### 📁 Project Structure
```
src/
├── client/          # React frontend
├── server/          # Express backend
└── shared/          # Shared TypeScript types
```

### 🛠️ Development Stack
- **Frontend**: React 18 + Mantine UI + Vite
- **Backend**: Node.js + Express + TypeScript
- **Tools**: tsx, concurrently, TypeScript compiler