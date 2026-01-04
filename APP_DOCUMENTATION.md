# AWS Cybersecurity Workshop Application

A TypeScript full-stack application for validating AWS cybersecurity configurations. This application provides a web interface to check various AWS security exercises from the original workshop.

## Features

- **Frontend**: React with Mantine UI components
- **Backend**: Express.js server with TypeScript  
- **Real-time Exercise Checking**: Validate AWS security configurations
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18, TypeScript, Mantine UI, Vite
- **Backend**: Express.js, TypeScript, Node.js
- **Development**: Concurrently for parallel dev servers

## Project Structure

```
src/
├── client/          # React frontend application
│   ├── App.tsx      # Main React component
│   ├── main.tsx     # React entry point
│   └── index.html   # HTML template
├── server/          # Express backend server
│   ├── index.ts     # Server entry point
│   └── routes/      # API routes
└── shared/          # Shared types and utilities
    └── types.ts     # TypeScript interfaces
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
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## API Endpoints

- `GET /api/exercises` - Get all available exercises
- `POST /api/exercises/:id/check` - Check a specific exercise
- `GET /api/health` - Health check endpoint

## Available Exercises

Based on the original workshop, the application includes:

1. **IAM Policies Review** - Check for overly permissive IAM policies
2. **S3 Bucket Security** - Verify S3 buckets are properly secured
3. **EC2 Security Groups** - Review security group configurations
4. **RDS Security** - Check RDS security settings
5. **VPC Network Security** - Validate VPC configurations

## Usage

1. Open the application in your browser
2. View the list of security exercises
3. Click "Check Exercise" to validate AWS configurations
4. Monitor the status of each exercise (pending, checking, passed, failed)

## Next Steps

- Integrate with AWS SDK for real AWS resource checking
- Add authentication and user management
- Implement detailed reporting and remediation suggestions
- Add configuration management for AWS credentials