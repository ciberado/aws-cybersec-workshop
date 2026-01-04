export interface Exercise {
  id: string
  title: string
  description: string
  category: 'iam' | 's3' | 'ec2' | 'rds' | 'general' | 'vpc' | 'lb'
  checkFunction: string
  expectedResult?: any
  points: number
}

export interface ExerciseResult {
  exerciseId: string
  passed: boolean
  message: string
  details?: any
  testResults?: TestCondition[]
}

export interface TestCondition {
  name: string
  description: string
  status: 'pass' | 'fail' | 'error' | 'warning'
  message: string
  details?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface AWSCredentials {
  aws_access_key_id: string
  aws_secret_access_key: string
  aws_session_token?: string
  region?: string
}

// For internal AWS SDK usage
export interface AWSSDKCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region?: string
}

// Base validation result interface
export interface ValidationResult {
  success: boolean
  message: string
  details: string[]
}

export interface AWSAccountInfo {
  accountId: string
  arn: string
  userId: string
  region: string
  userName?: string
}

export interface CredentialsValidationResult {
  isValid: boolean
  accountInfo?: AWSAccountInfo
  error?: string
}