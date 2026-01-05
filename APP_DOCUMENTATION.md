# AWS Cybersecurity Workshop Application

A TypeScript full-stack application for validating AWS cybersecurity configurations. This application provides a web interface to check various AWS security exercises from the original workshop with **real AWS integration**.

## Features

- **Frontend**: React with Mantine UI components
- **Backend**: Express.js server with TypeScript  
- **AWS Integration**: Real-time validation using AWS SDK
- **Credential Management**: Secure AWS credential input and validation
- **Workshop Exercises**: 9 specific exercises matching workshop requirements (10 points total)
- **Account Information**: Display AWS account details and region
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18, TypeScript, Mantine UI, Vite
- **Backend**: Express.js, TypeScript, Node.js
- **AWS SDK**: STS, IAM, S3, EC2, RDS, Elastic Load Balancing v2
- **Development**: Concurrently for parallel dev servers

## Project Structure

```
src/
├── client/          # React frontend application
│   ├── App.tsx      # Main React component with authentication flow
│   ├── main.tsx     # React entry point
│   └── index.html   # HTML template
├── server/          # Express backend server
│   ├── index.ts     # Server entry point
│   └── routes/      # API routes
│       ├── credentials.ts   # AWS credential validation
│       └── exercises.ts     # Workshop exercises
└── shared/          # Shared types and utilities
    └── types.ts     # TypeScript interfaces (AWS + Exercise types)
```

## Development

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This starts both the React development server (Vite) and the Express server concurrently:
- Frontend: http://localhost:5175 (Vite auto-selects port, configured for external access)
- Backend API: http://localhost:3002

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## API Endpoints

- `GET /api/exercises` - Get all workshop exercises (9 exercises)
- `POST /api/exercises/:id/check` - Check a specific exercise (currently simulated)
- `POST /api/credentials/validate` - Validate AWS credentials and get account info
- `GET /api/health` - Health check endpoint

## Workshop Exercises (10 Points Total)

The application implements the exact 9 exercises from the workshop:

1. **S3 Data Bucket Security** (1 point) - Verify pokemon.csv access control
2. **S3 Web Bucket Configuration** (1 point) - Validate public hosting setup  
3. **VPC Network Design** (1 point) - Check CIDR and subnet segmentation
4. **Network Route Tables** (2 points) - Verify traffic control between tiers
5. **Security Groups Microsegmentation** (1 point) - Validate albsg, appsg, bdsg
6. **RDS Database Protection** (1 point) - Check PostgreSQL Multi-AZ in internal subnets
7. **Application Load Balancer** (1 point) - Validate ALB and target group config
8. **Launch Template Security** (1 point) - Verify secure template with IAM role
9. **Auto Scaling Group** (1 point) - Check ASG in private subnets

## Current Application Flow

### 1. Credential Input
- User enters AWS credentials in INI format
- Application parses credentials (access key, secret key, session token)
- Real-time validation against AWS using STS GetCallerIdentity

### 2. Account Validation  
- Displays AWS account ID, ARN, User ID, Region
- Attempts to get IAM user name if permissions allow
- Shows validation errors if credentials are invalid

### 3. Workshop Exercises
- Once authenticated, user can access 9 workshop exercises
- Each exercise shows category, description, and point value
- Currently simulates exercise checking (next development phase)

## Usage

### 1. Start Development Environment
```bash
npm run dev
```

### 2. Access Application
- Open browser to http://localhost:5175 (or the port Vite displays)
- The application will show the AWS Credentials Setup screen

### 3. Enter AWS Credentials
Paste your AWS credentials in INI format:
```ini
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
aws_session_token=YOUR_SESSION_TOKEN
```

### 4. Validate and Continue
- Click "Validate Credentials" to verify against AWS
- Once validated, click "Continue to Exercises"
- View and interact with the 9 workshop exercises

## Next Development Steps

### Phase 1: Implement Remaining AWS Validation Logic ⚡
**Priority: High** - Convert remaining simulated checks to real AWS resource validation

#### 1.1 S3 Validation ✅ COMPLETED
- ✅ **S3 Data Bucket Check**: Comprehensive security validation with real AWS API
- ✅ **S3 Web Bucket Check**: Static website hosting validation
  - ✅ Check bucket website configuration
  - ✅ Verify public access and bucket policy
  - ✅ Test actual HTTP accessibility

#### 1.2 VPC and Network Validation ✅ COMPLETED
- ✅ **VPC Architecture Check**: CIDR design and subnet segmentation
  - ✅ Use EC2Client to discover VPCs with tags `proyecto=cybersec`
  - ✅ Verify /16 CIDR range and three-tier subnet structure
  - ✅ Validate subnet distribution across availability zones
- ✅ **Route Table Validation**: Traffic control between tiers
  - ✅ Validate Internet Gateway routing for public subnets (fixed "available" state)
  - ✅ Check NAT Gateway routing for private subnets (fixed detection logic)
  - ✅ Ensure internal subnets have no internet access
  - ✅ Implement three-tier subnet classification by actual routes

#### 1.3 Security and Compute Validation
- ✅ **Security Groups Check**: Validate microsegmentation rules (COMPLETE)
  - ✅ Verify albsg (ports 80/443 from 0.0.0.0/0)
  - ✅ Verify appsg (port 8080 from albsg only)
  - ✅ Verify bdsg (port 5432 from appsg only)
  - ✅ Enhanced UI with detailed test results and chain analysis
- ✅ **RDS Validation**: Check PostgreSQL database protection (COMPLETE)
  - ✅ Verify Multi-AZ configuration
  - ✅ Check subnet group uses internal subnets only
  - ✅ Validate security group assignment
  - ✅ Comprehensive network isolation and public access prevention
- ✅ **Load Balancer Check**: Validate ALB configuration (COMPLETE)
  - ✅ Verify Target Group `maintg` exists with health checks and port 8080
  - ✅ Check ALB `pokemonlb` configuration and security group
  - ✅ Validate listener configuration on port 80 routing to maintg
  - ✅ Comprehensive ALB and target group validation with detailed test results
- [ ] **Compute Layer Validation**: Check Launch Template and Auto Scaling
  - Verify Launch Template with IAM role assignment
  - Check Auto Scaling Group in private subnets only
  - Validate target group registration

### Phase 2: Enhanced Features 🚀
**Priority: Medium** - Improve user experience and functionality

- [ ] **Detailed Results Display**: Show specific validation results with remediation tips
- [ ] **Progress Tracking**: Save validation history and score progress
- [ ] **Export Reports**: Generate PDF/JSON reports of validation results
- [ ] **Resource Discovery**: Auto-discover AWS resources with project tags
- [ ] **Real-time Updates**: WebSocket updates for long-running validations

### Phase 3: Advanced Security Features 🔒
**Priority: Future** - Additional security enhancements

- [ ] **Credential Security**: Implement secure credential storage/encryption
- [ ] **Multi-Account Support**: Support validation across multiple AWS accounts
- [ ] **Compliance Reporting**: Generate compliance reports for different frameworks
- [ ] **Automated Remediation**: Suggest or implement security fixes
- [ ] **Integration**: Connect with AWS Config, Security Hub, or other tools

### Development Guidelines

#### Code Structure for AWS Validations
Create validation functions in `/src/server/validators/`:
```
src/server/validators/
├── s3Validators.ts       # ✅ S3 bucket validations (COMPLETE)
├── vpcValidators.ts      # ✅ VPC and networking validations (COMPLETE)
├── securityValidators.ts # ✅ Security groups validations (COMPLETE)
├── computeValidators.ts  # EC2, ALB, RDS validations (TODO)
└── index.ts             # ✅ Export all validators
```

**Recent Fixes Applied:**
- Fixed Internet Gateway validation to accept "available" attachment state
- Fixed NAT Gateway route detection to properly identify private tier subnets
- Enhanced subnet classification logic for accurate three-tier architecture validation

#### Implementation Pattern
Each validator should:
1. Accept AWS credentials and return structured results
2. Include error handling for AWS API failures
3. Provide detailed success/failure messages
4. Return specific resource information for debugging

#### Testing Strategy
- Unit tests for each validator function
- Integration tests with mocked AWS responses
- Manual testing with real AWS resources
- Error scenario testing (missing resources, permission errors)

## Common Implementation Pitfalls & Best Practices

> **Important**: Follow these patterns to avoid common issues when implementing new exercise validators.

### ✅ ExerciseResult Interface Compliance
**Problem**: Using incorrect property names in return objects
```typescript
// ❌ WRONG - will cause compilation errors
return {
  success: true,  // Property doesn't exist in ExerciseResult
  message: "...",
  // ...
}

// ✅ CORRECT - matches ExerciseResult interface
return {
  exerciseId: 'exercise-id',  // Required: string
  passed: true,               // Required: boolean (not 'success')
  message: "...",            // Required: string
  testResults: [...],        // Optional: TestCondition[] (for "Show Details")
  details: {...}             // Optional: any (additional metadata)
}
```

### ✅ Credentials Parameter Pattern
**Problem**: Inconsistent credential parameter handling
```typescript
// ❌ WRONG - extracting individual properties inconsistent with other validators
export async function validateExample(
  accessKey: string,
  secretKey: string,
  sessionToken?: string
): Promise<ExerciseResult>

// ✅ CORRECT - use AWSCredentials object like other validators
export async function validateExample(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const ec2 = new EC2Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,      // Note: underscore format
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  });
}
```

### ✅ "Show Details" UI Integration
**Problem**: Details not appearing in frontend despite implementation
```typescript
// ❌ WRONG - frontend won't show "Show Details" button
return {
  exerciseId: 'example',
  passed: true,
  message: "Success",
  details: {
    summary: "Detailed information here..."  // Won't appear in UI
  }
}

// ✅ CORRECT - use testResults for "Show Details" functionality
return {
  exerciseId: 'example',
  passed: true,
  message: "Success",
  testResults: [                    // This enables "Show Details" button
    {
      name: 'test-1',
      description: 'Test description',
      status: 'pass' as const,      // 'pass' | 'fail' | 'error' | 'warning'
      message: 'Test message',
      details: 'Detailed explanation'
    }
  ],
  details: {                       // Additional metadata (optional)
    summary: "...",
    resourceInfo: {...}
  }
}
```

### ✅ Import Requirements
**Problem**: Missing required imports causing compilation errors
```typescript
// ✅ REQUIRED imports for exercise validators
import { ExerciseResult, AWSCredentials, TestCondition } from '../../shared/types.js';
import { EC2Client, /* specific commands */ } from '@aws-sdk/client-ec2';

// Don't forget TestCondition if using testResults array
```

### ✅ Validator Export Consistency
**Problem**: Inconsistent function naming between definition and export
```typescript
// In validator file (e.g., computeValidators.ts)
export async function validateRDSProtection(credentials: AWSCredentials): Promise<ExerciseResult>

// In validators/index.ts - MUST match exactly
export { validateRDSProtection } from './computeValidators.js'

// In exercises route - MUST match export name
import { validateRDSProtection } from '../validators/index.js'
```

### ✅ Error Handling Pattern
**Problem**: Inconsistent error handling and user feedback
```typescript
// ✅ RECOMMENDED error handling pattern
export async function validateExample(credentials: AWSCredentials): Promise<ExerciseResult> {
  try {
    // AWS API calls here
    
    const testResults: TestCondition[] = [
      // Individual test validations
    ];
    
    return {
      exerciseId: 'example',
      passed: allTestsPassed,
      message: passed ? 'Success message' : 'Failure summary',
      testResults,
      details: { /* additional info */ }
    };
    
  } catch (error) {
    console.error('Error validating example:', error);
    
    const testResults: TestCondition[] = [{
      name: 'validation-error',
      description: 'Example validation process',
      status: 'error',
      message: 'Failed to validate due to AWS API error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }];
    
    return {
      exerciseId: 'example',
      passed: false,
      message: 'Validation failed due to error',
      testResults,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}
```

### ✅ TestCondition Best Practices
```typescript
// ✅ Well-structured TestCondition for clear UI display
{
  name: 'descriptive-test-name',           // Unique identifier
  description: 'User-friendly test name',  // Shows in UI as test title
  status: 'pass',                         // Determines icon/color in UI
  message: 'Concise result summary',      // Main result message
  details: 'Detailed explanation\nMultiline supported'  // Expandable details
}
```

Following these patterns ensures consistent behavior, proper UI integration, and maintainable code across all exercise validators.

## Contribution Guidelines

1. **Commit Messages**: Use conventional commits (feat:, fix:, docs:)
2. **Changelog**: Update CHANGELOG.md with each significant change
3. **Testing**: Test AWS validations with real resources when possible
4. **Documentation**: Update this file when adding new features

---

## Current Status: ✅ First 7 Exercises Implemented with Enhanced Details

The foundation is complete with:
- ✅ Real AWS credential handling and account validation
- ✅ Workshop exercise structure matching requirements
- ✅ UI flow for authentication and exercise display with detailed test results
- ✅ Proper TypeScript types and error handling
- ✅ Development environment ready for external access
- ✅ **S3 Data Bucket Validation** with comprehensive security checks
- ✅ **S3 Web Bucket Validation** with real public access testing
- ✅ **VPC Architecture Validation** with subnet design verification
- ✅ **Route Table Validation** with Internet Gateway and NAT Gateway routing
- ✅ **Security Groups Validation** with microsegmentation rule checking and enhanced UI details
- ✅ **RDS Database Protection** with Multi-AZ, network isolation, and security validation
- ✅ **Application Load Balancer** with ALB and target group comprehensive validation

**Recently completed**: Application Load Balancer validation with comprehensive security checks including Target Group 'maintg' verification (port 8080, health checks, tags), ALB 'pokemonlb' configuration validation (internet-facing, application type, security groups), and listener configuration analysis (HTTP port 80 routing to maintg). Implements complete ALB infrastructure validation with detailed test results.