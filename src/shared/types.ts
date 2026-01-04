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
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region?: string
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