import { Router } from 'express'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { IAMClient, GetUserCommand } from '@aws-sdk/client-iam'
import type { AWSCredentials, AWSAccountInfo, APIResponse, CredentialsValidationResult, StudentInfo } from '../../shared/types.js'

const router = Router()

// Simple in-memory stores (in production, use secure storage)
const credentialStore = new Map<string, AWSCredentials>()
const studentInfoStore = new Map<string, StudentInfo>()

// Generate a simple session ID (in production, use proper session management)
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Get stored credentials by session ID
export function getStoredCredentials(sessionId: string): AWSCredentials | null {
  return credentialStore.get(sessionId) || null
}

// Get stored student info by session ID
export function getStoredStudentInfo(sessionId: string): StudentInfo | null {
  return studentInfoStore.get(sessionId) || null
}

// Parse AWS credentials from INI format
function parseCredentialsFromINI(iniContent: string): AWSCredentials | null {
  try {
    const lines = iniContent.split('\n')
    const credentials: Partial<AWSCredentials> = {}
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('aws_access_key_id=')) {
        credentials.aws_access_key_id = trimmedLine.replace('aws_access_key_id=', '')
      } else if (trimmedLine.startsWith('aws_secret_access_key=')) {
        credentials.aws_secret_access_key = trimmedLine.replace('aws_secret_access_key=', '')
      } else if (trimmedLine.startsWith('aws_session_token=')) {
        credentials.aws_session_token = trimmedLine.replace('aws_session_token=', '')
      }
    }
    
    if (credentials.aws_access_key_id && credentials.aws_secret_access_key) {
      return {
        aws_access_key_id: credentials.aws_access_key_id,
        aws_secret_access_key: credentials.aws_secret_access_key,
        aws_session_token: credentials.aws_session_token,
        region: 'us-east-1' // Default to workshop requirement
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing credentials:', error)
    return null
  }
}

// Validate AWS credentials and get account info
async function validateCredentials(credentials: AWSCredentials): Promise<CredentialsValidationResult> {
  try {
    const stsClient = new STSClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.aws_access_key_id,
        secretAccessKey: credentials.aws_secret_access_key,
        sessionToken: credentials.aws_session_token
      }
    })

    const command = new GetCallerIdentityCommand({})
    const response = await stsClient.send(command)
    
    if (!response.Account || !response.Arn || !response.UserId) {
      return {
        isValid: false,
        error: 'Invalid response from AWS STS'
      }
    }

    const accountInfo: AWSAccountInfo = {
      accountId: response.Account,
      arn: response.Arn,
      userId: response.UserId,
      region: credentials.region || 'us-east-1'
    }

    // Try to get user name if it's an IAM user
    if (response.Arn && response.Arn.includes(':user/')) {
      try {
        const iamClient = new IAMClient({
          region: credentials.region || 'us-east-1',
          credentials: {
            accessKeyId: credentials.aws_access_key_id,
            secretAccessKey: credentials.aws_secret_access_key,
            sessionToken: credentials.aws_session_token
          }
        })
        
        const userName = response.Arn.split('/').pop()
        if (userName) {
          const userCommand = new GetUserCommand({ UserName: userName })
          const userResponse = await iamClient.send(userCommand)
          accountInfo.userName = userResponse.User?.UserName
        }
      } catch (iamError) {
        // IAM permissions might not allow GetUser, but that's okay
        console.log('Could not get user details:', iamError)
      }
    }

    return {
      isValid: true,
      accountInfo
    }
  } catch (error) {
    console.error('Error validating credentials:', error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// POST /api/credentials/validate - Validate AWS credentials
router.post('/validate', async (req, res) => {
  try {
    const { credentialsText, studentInfo } = req.body

    if (!credentialsText || typeof credentialsText !== 'string') {
      const response: APIResponse = {
        success: false,
        error: 'Credentials text is required'
      }
      return res.status(400).json(response)
    }

    if (!studentInfo || !studentInfo.name || !studentInfo.surnames) {
      const response: APIResponse = {
        success: false,
        error: 'Student name and surnames are required'
      }
      return res.status(400).json(response)
    }

    // Validate student info format
    if (typeof studentInfo.name !== 'string' || typeof studentInfo.surnames !== 'string') {
      const response: APIResponse = {
        success: false,
        error: 'Student name and surnames must be valid text'
      }
      return res.status(400).json(response)
    }

    if (studentInfo.name.trim().length === 0 || studentInfo.surnames.trim().length === 0) {
      const response: APIResponse = {
        success: false,
        error: 'Student name and surnames cannot be empty'
      }
      return res.status(400).json(response)
    }

    // Parse credentials from INI format
    const credentials = parseCredentialsFromINI(credentialsText)
    if (!credentials) {
      const response: APIResponse = {
        success: false,
        error: 'Invalid credentials format. Please provide credentials in INI format.'
      }
      return res.status(400).json(response)
    }

    // Validate credentials with AWS
    const validationResult = await validateCredentials(credentials)

    // If valid, store credentials and student info with session ID
    let sessionId: string | undefined
    if (validationResult.isValid) {
      sessionId = generateSessionId()
      credentialStore.set(sessionId, credentials)
      studentInfoStore.set(sessionId, {
        name: studentInfo.name.trim(),
        surnames: studentInfo.surnames.trim()
      })
    }

    const response: APIResponse<CredentialsValidationResult & { sessionId?: string }> = {
      success: true,
      data: {
        ...validationResult,
        studentInfo: validationResult.isValid ? {
          name: studentInfo.name.trim(),
          surnames: studentInfo.surnames.trim()
        } : undefined,
        sessionId
      }
    }
    
    res.json(response)
  } catch (error) {
    console.error('Credentials validation error:', error)
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
    res.status(500).json(response)
  }
})

export default router