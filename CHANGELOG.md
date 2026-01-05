# Changelog

All notable changes to the AWS Cybersecurity Workshop application will be documented in this file.

## [2.0.0] - 2026-01-05 - Evaluation Submission & CSV Recording

### Added
- **Evaluation Submission System** - Complete assessment result recording with CSV export
  - Submit evaluation button integrated in score sidebar
  - Real-time recording of actual exercise completion states
  - CSV export with student information, AWS account details, and scores
  - Concurrent access handling for multiple simultaneous submissions
  - Secure data directory structure (`data/evaluation_results.csv`)
  - Spanish student information integration (Surnames, Name format)

### Enhanced
- **CSV Recording Accuracy**
  - Records actual exercise pass/fail states instead of default pending
  - Captures real AWS Account ID and region from authenticated sessions
  - Calculates accurate scores based on completed exercises
  - Includes detailed exercise results with individual status tracking
  - Timestamp tracking for submission auditing

### Technical
- Added concurrent-safe CSV writing with queue-based file access
- Implemented proper data directory organization with auto-creation
- Enhanced frontend-backend communication for exercise state synchronization
- Added submission status feedback with success/error states
- Secure session-based data retrieval for student and account information
- Git ignore patterns for data privacy and security

### Security & Privacy
- Student evaluation data isolated in gitignored data directory
- AWS account information securely recorded without exposure
- Session-based authentication for submission authorization
- Concurrent submission handling prevents data corruption

### User Experience
- Prominent "Submit Evaluation" button in score dashboard
- Real-time submission feedback with loading states
- Success/error notifications for submission status
- Gradient button styling for clear call-to-action
- Form validation ensuring complete information before submission

## [1.9.0] - 2026-01-05 - Assessment Score Sidebar

### Added
- **Assessment Score Dashboard** - Comprehensive real-time score tracking in sidebar
  - Large ring progress indicator with percentage completion
  - Prominent score display showing "current/max points" format
  - Gold trophy icon for visual motivation and achievement context
  - Smart color-coded progress (green 80%+, yellow 60-79%, red <60%)
  - Real-time exercise completion counter with in-progress tracking
  - Responsive design maintaining mobile compatibility

### Enhanced
- **User Experience**
  - Replaced static category sections with dynamic score visualization
  - Immediate feedback on workshop progress and performance
  - Visual motivation through achievement-focused design
  - Clear target visualization for 10-point workshop completion
  - Automatic updates as students complete exercises

### Technical
- Added `RingProgress` component with dynamic color coding
- Implemented real-time score calculation from exercise states
- Enhanced progress tracking with percentage-based visual feedback
- Centered responsive layout for optimal score display
- Added trophy icon and achievement-oriented visual design

### UI/UX
- Transformed sidebar from static categories to dynamic score tracker
- Prominent numerical score display for immediate progress awareness
- Color psychology implementation for performance feedback
- Clean, focused presentation encouraging completion

## [1.8.0] - 2026-01-05 - Student Information Integration

### Added
- **Student Information Form** - Complete Spanish academic format support
  - Name (Nombre) input field for student's first name(s)
  - Surnames (Apellidos) input field for complete surname combination
  - Spanish formal display format: "Surnames, Name" throughout the application
  - Required validation for both name and surnames before credential validation
  - Persistent student identity display in exercise header
  - Bilingual form labels (Spanish with English context)

### Enhanced
- **Form User Experience**
  - Two-field student information layout (Name + Surnames)
  - Clear instructions referencing official Spanish documents
  - Visual separation between student info and AWS credentials sections
  - Updated validation flow requiring complete student identification
  - Spanish academic institution compatibility

### Technical
- Updated `StudentInfo` interface to use `name` and `surnames` properties
- Enhanced backend validation for student information requirements
- Secure session-based storage for student identity data
- Updated frontend state management for new field structure
- Improved error messaging for incomplete student information
- Spanish naming convention support throughout type system

### UI/UX
- Professional Spanish academic format presentation
- Student identity prominently displayed in exercises view
- Comprehensive form reset including student information
- Grid-based responsive layout for student information fields
- Enhanced visual hierarchy with proper section separation

## [1.7.0] - 2026-01-05 - Auto Scaling Group Validation - Workshop Complete! 🎉

### Added
- **Auto Scaling Group Validation (Exercise 9)** - Complete ASG deployment security validation
  - Project tag validation (proyecto=cybersec, funcion=computacion)
  - Private subnet deployment verification (not public/internal tiers)
  - Launch Template integration validation
  - Target group registration to 'maintg' verification
  - Fixed capacity configuration validation (2 instances)
  - Instance health and availability zone distribution analysis
  - Detailed test results with "Show Details" functionality
  - Real-time AWS API integration for Auto Scaling Groups

### Completed
- **All 9 Workshop Exercises** now have real AWS validation
- **Complete Workshop Implementation** with comprehensive security assessments
- **10 Points Total** - All exercises validate actual AWS infrastructure

### Technical
- Added `@aws-sdk/client-auto-scaling` integration
- Implemented `validateAutoScalingGroup` function with 4 comprehensive tests
- Enhanced exercises route to support all 9 exercises with real validation
- Removed simulation logic - all exercises use real AWS API calls
- Complete workshop validation suite with detailed test results
- Advanced subnet tier classification for ASG placement validation
- Instance health and multi-AZ distribution analysis

## [1.6.1] - 2026-01-05 - Launch Template Architecture Correction

### Fixed
- **Launch Template Validation Architecture** - Corrected validation logic for workshop design
  - Removed security group requirements from Launch Template (configured at ASG level)
  - Removed key pair requirements from Launch Template (configured at ASG level)
  - Launch Template now focuses on: IAM role, AMI, user data, instance type
  - Auto Scaling Group will handle: security groups, key pairs, subnet placement
  - Updated validation messages to reflect proper architecture separation
  - Follows AWS best practices for Launch Template vs ASG responsibility separation

## [1.6.0] - 2026-01-05 - Launch Template Security Validation

### Added
- **Launch Template Security Validation (Exercise 8)** - Complete launch template configuration validation
  - Project tag validation (proyecto=cybersec, funcion=computacion)
  - IAM role assignment verification for secure AWS access
  - Ubuntu AMI base validation and image security analysis
  - User data configuration review for bootstrap automation
  - Security group and instance configuration validation
  - Detailed test results with "Show Details" functionality
  - Real-time AWS API integration for EC2 launch templates

### Technical
- Enhanced EC2Client with launch template and AMI validation commands
- Implemented `validateLaunchTemplate` function with 4 comprehensive tests
- Added helper functions for template discovery, configuration, AMI, and user data validation
- Enhanced exercises route to support launch template validation
- Advanced AMI analysis with Ubuntu detection and security assessment
- User data decoding and bootstrap script analysis

## [1.5.0] - 2026-01-05 - Application Load Balancer Validation

### Added
- **Application Load Balancer Validation (Exercise 7)** - Complete ALB configuration validation
  - Target Group 'maintg' discovery and validation (port 8080, health checks)
  - ALB 'pokemonlb' configuration validation (internet-facing, application type)
  - Listener configuration analysis (HTTP port 80 routing to maintg)
  - Comprehensive tag validation for both ALB and target group
  - Detailed test results with "Show Details" functionality
  - Real-time AWS API integration for ELB v2 resources

### Technical
- Added `@aws-sdk/client-elastic-load-balancing-v2` integration
- Implemented `validateALBConfiguration` function with 5 comprehensive tests
- Enhanced exercises route to support ALB validation
- Added helper functions for target group and load balancer discovery
- Comprehensive listener validation with routing analysis

## [1.4.0] - 2026-01-05 - RDS Database Protection Validation

### ✨ Added
- **Complete RDS Database Protection Validation**: Sixth fully functional exercise with comprehensive AWS integration
  - PostgreSQL database discovery with project tag validation (`proyecto=cybersec`)
  - Multi-AZ deployment verification for high availability and business continuity
  - Network isolation validation ensuring databases are in internal subnets only
  - Security group assignment verification and access control validation
  - Public accessibility prevention checks
  - Comprehensive subnet tier classification with route table analysis
- **Enhanced Database Security Checks**:
  - Database engine validation (PostgreSQL requirement)
  - High availability configuration analysis (primary/standby nodes)
  - Backup retention period validation
  - Subnet group isolation verification with three-tier architecture compliance
  - Cross-validation with existing VPC validators for subnet classification
- **Detailed Test Results**:
  - 6 individual test conditions with pass/fail/warning/error status
  - Comprehensive "Show Details" functionality with technical specifics
  - Network isolation analysis with subnet-by-subnet route classification
  - Security recommendations and remediation guidance

### 🔧 Technical
- Created `computeValidators.ts` with RDS protection validation logic
- Integrated RDS Client and EC2 Client for comprehensive database and network analysis
- Implemented subnet tier classification reusing existing VPC validation patterns
- Added TypeScript type safety fixes for AWS SDK subnet ID handling
- Enhanced error handling for RDS API failures and missing resources

### 📊 Progress
- **6/9 Exercises Complete**: S3 Security (2), VPC Architecture (1), Route Tables (1), Security Groups (1), RDS Protection (1)
- All implemented exercises feature comprehensive "Show Details" functionality
- Real AWS integration ensures accurate validation of security configurations
- Consistent TestCondition-based result structure across all validators

### 🛠️ Next Steps
- Remaining exercises: Load Balancer (1), Launch Template (1), Auto Scaling Group (1)
- Focus on compute layer and application deployment security validation

## [1.3.0] - 2026-01-05 - Security Groups Validation with Enhanced Details

### ✨ Added
- **Security Groups Microsegmentation Validation**: Complete implementation of Exercise 5
  - Real AWS API integration for validating albsg, appsg, and bdsg security groups
  - Comprehensive rule checking including protocol, port, and source validation
  - Detection of improper IP range access and unauthorized security group references
  - Enhanced error reporting with specific configuration recommendations
- **Enhanced UI Details Feature**: Advanced "Show Details" functionality for security groups
  - Individual test conditions for each security group (albsg, appsg, bdsg)
  - Microsegmentation chain analysis (Internet → ALB → App → Database)
  - Progressive disclosure with pass/fail indicators for each validation step
  - Detailed rule comparison (expected vs actual configurations)
- **Defense-in-Depth Analysis**: Comprehensive security posture evaluation
  - Validates proper tier isolation and access controls
  - Identifies security violations and misconfigured access patterns
  - Provides educational feedback on AWS security best practices

### 🔧 Technical
- Created `securityValidators.ts` with full microsegmentation validation logic
- Implemented TestCondition-based result structure for enhanced UI integration
- Added comprehensive error handling for VPC discovery and API failures
- Enhanced validation functions with detailed rule analysis and security recommendations

### 📊 Progress
- **5/9 Exercises Complete**: S3 Security (2), VPC Architecture (1), Route Tables (1), Security Groups (1)
- All implemented exercises now feature comprehensive "Show Details" functionality
- Real AWS integration ensures accurate validation of security configurations

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