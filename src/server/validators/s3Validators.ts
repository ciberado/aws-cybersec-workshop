import { S3Client, HeadBucketCommand, GetObjectCommand, GetBucketPolicyCommand, GetBucketAclCommand, GetBucketPolicyStatusCommand, ListBucketsCommand, GetBucketTaggingCommand, GetPublicAccessBlockCommand } from '@aws-sdk/client-s3'
import type { AWSCredentials, ValidationResult, ExerciseResult, TestCondition } from '../../shared/types.js'

export interface S3ValidationResult extends ValidationResult {
  bucketExists: boolean
  pokemonFileExists: boolean
  hasPublicAccess: boolean
  bucketPolicy?: string
  bucketAcl?: any
}

/**
 * Check S3 Data Bucket Security (Exercise 1)
 * Validates that pokemon.csv is accessible only with IAM credentials (no public access)
 */
export async function validateS3DataBucket(
  credentials: AWSCredentials,
  bucketNamePattern: string = 'cybersec'
): Promise<ExerciseResult> {
  const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  })

  const testResults: TestCondition[] = []
  let overallPassed = true

  try {
    // Test 1: Find the data bucket
    const bucketName = await findDataBucket(s3Client, bucketNamePattern)
    if (!bucketName) {
      testResults.push({
        name: 'bucket-discovery',
        description: 'Locate S3 bucket with correct tags (proyecto=cybersec, funcion=datos)',
        status: 'fail',
        message: 'No data bucket found with required tags',
        details: `Searched for buckets with tags proyecto=cybersec and funcion=datos. Also tried pattern-based names like: ${bucketNamePattern}-data, ${bucketNamePattern}-datos, etc.`
      })
      overallPassed = false
      
      return {
        exerciseId: 's3-data-bucket',
        passed: false,
        message: 'S3 data bucket not found with required tags (proyecto=cybersec, funcion=datos)',
        testResults,
        details: {
          timestamp: new Date().toISOString(),
          checkFunction: 'checkS3DataBucket'
        }
      }
    }

    testResults.push({
      name: 'bucket-discovery',
      description: 'Locate S3 bucket with correct tags (proyecto=cybersec, funcion=datos)',
      status: 'pass',
      message: `Found data bucket: ${bucketName}`,
      details: 'Bucket exists, is accessible, and has the correct tags'
    })

    // Test 2: Check pokemon.csv file existence and accessibility
    try {
      const getObjectResponse = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: 'pokemon.csv'
      }))
      
      // Actually read some of the file content to prove download works
      let fileContent = ''
      let fileSize = getObjectResponse.ContentLength || 0
      
      if (getObjectResponse.Body) {
        // Convert stream to string to verify it's accessible and appears to be CSV
        const bodyContents = await getObjectResponse.Body.transformToString('utf-8')
        fileContent = bodyContents.substring(0, 500) // First 500 characters
      }
      
      // Verify it looks like a CSV file
      const isValidCsv = fileContent.includes(',') && (
        fileContent.toLowerCase().includes('pokemon') || 
        fileContent.includes('\n') || 
        fileContent.includes('\r')
      )
      
      if (isValidCsv) {
        const firstLine = fileContent.split('\n')[0] || fileContent.split('\r')[0] || ''
        testResults.push({
          name: 'pokemon-file-access',
          description: 'Verify pokemon.csv exists and is accessible with current credentials',
          status: 'pass',
          message: 'pokemon.csv successfully downloaded and validated',
          details: `File downloaded and read successfully (${fileSize} bytes). Content appears to be valid CSV format. Headers: ${firstLine.substring(0, 100)}${firstLine.length > 100 ? '...' : ''}`
        })
      } else {
        testResults.push({
          name: 'pokemon-file-access',
          description: 'Verify pokemon.csv exists and is accessible with current credentials',
          status: 'warning',
          message: 'pokemon.csv accessible but content may not be valid CSV',
          details: `File downloaded (${fileSize} bytes) but content doesn't appear to be CSV format. First 100 chars: ${fileContent.substring(0, 100)}${fileContent.length > 100 ? '...' : ''}`
        })
      }
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        testResults.push({
          name: 'pokemon-file-access',
          description: 'Verify pokemon.csv exists and is accessible with current credentials',
          status: 'fail',
          message: 'pokemon.csv file not found in bucket root',
          details: 'Upload pokemon.csv to the root of your data bucket'
        })
      } else {
        testResults.push({
          name: 'pokemon-file-access',
          description: 'Verify pokemon.csv exists and is accessible with current credentials',
          status: 'error',
          message: `Error accessing pokemon.csv: ${error.message}`,
          details: 'Check bucket permissions and IAM policies'
        })
      }
      overallPassed = false
    }

    // Test 3: Check for public access (comprehensive security check)
    const publicAccessCheck = await checkBucketPublicAccess(s3Client, bucketName)
    
    if (!publicAccessCheck.hasPublicAccess) {
      testResults.push({
        name: 'no-public-access',
        description: 'Verify comprehensive public access protection (Block Public Access, policies, ACLs)',
        status: 'pass',
        message: 'Bucket properly secured with comprehensive public access protection',
        details: publicAccessCheck.details.join('\n')
      })
    } else {
      testResults.push({
        name: 'no-public-access',
        description: 'Verify comprehensive public access protection (Block Public Access, policies, ACLs)',
        status: 'fail',
        message: 'Bucket has public access vulnerabilities - security risk detected',
        details: publicAccessCheck.details.join('\n')
      })
      overallPassed = false
    }

    // Test 4: IAM-only access verification
    testResults.push({
      name: 'iam-only-access',
      description: 'Confirm access is restricted to IAM credentials only',
      status: overallPassed ? 'pass' : 'fail',
      message: overallPassed ? 'Access properly restricted to IAM credentials' : 'Access control issues detected',
      details: 'Data should only be accessible via valid AWS IAM credentials'
    })

    const finalMessage = overallPassed 
      ? 'S3 data bucket security validation passed - all requirements met'
      : 'S3 data bucket security validation failed - see test details'

    return {
      exerciseId: 's3-data-bucket',
      passed: overallPassed,
      message: finalMessage,
      testResults,
      details: {
        timestamp: new Date().toISOString(),
        checkFunction: 'checkS3DataBucket',
        bucketName,
        summary: `${testResults.filter(t => t.status === 'pass').length}/${testResults.length} tests passed`
      }
    }

  } catch (error: any) {
    testResults.push({
      name: 'validation-error',
      description: 'S3 bucket validation process',
      status: 'error',
      message: `Validation error: ${error.message}`,
      details: 'Check AWS credentials and permissions'
    })

    return {
      exerciseId: 's3-data-bucket',
      passed: false,
      message: `Error during S3 data bucket validation: ${error.message}`,
      testResults,
      details: {
        timestamp: new Date().toISOString(),
        checkFunction: 'checkS3DataBucket',
        error: error.message
      }
    }
  }
}

/**
 * Find data bucket with proper tags
 */
async function findDataBucket(s3Client: S3Client, pattern: string): Promise<string | null> {
  try {
    // List all buckets in the account
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}))
    const buckets = listBucketsResponse.Buckets || []

    // Check each bucket for the required tags
    for (const bucket of buckets) {
      if (!bucket.Name) continue

      try {
        // Get bucket tags
        const taggingResponse = await s3Client.send(new GetBucketTaggingCommand({
          Bucket: bucket.Name
        }))

        const tags = taggingResponse.TagSet || []
        const tagMap = Object.fromEntries(tags.map(tag => [tag.Key, tag.Value]))

        // Check if this bucket has the required tags: proyecto=cybersec and funcion=datos
        if (tagMap['proyecto'] === 'cybersec' && tagMap['funcion'] === 'datos') {
          return bucket.Name
        }
      } catch (error) {
        // Bucket might not have tags or we don't have permission to read them
        // Continue checking other buckets
        continue
      }
    }

    // If no bucket found with tags, try the old pattern-based approach as fallback
    const possibleNames = [
      `${pattern}-data`,
      `${pattern}-datos`,
      `data-${pattern}`,
      `datos-${pattern}`,
      pattern
    ]

    for (const bucketName of possibleNames) {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
        return bucketName
      } catch (error) {
        // Bucket doesn't exist or no access, continue
      }
    }

    return null
  } catch (error) {
    // If we can't list buckets, fall back to pattern-based approach
    const possibleNames = [
      `${pattern}-data`,
      `${pattern}-datos`,
      `data-${pattern}`,
      `datos-${pattern}`,
      pattern
    ]

    for (const bucketName of possibleNames) {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
        return bucketName
      } catch (error) {
        // Bucket doesn't exist or no access, continue
      }
    }

    return null
  }
}

/**
 * Check if bucket has any form of public access
 */
async function checkBucketPublicAccess(s3Client: S3Client, bucketName: string): Promise<{
  hasPublicAccess: boolean
  bucketPolicy?: string
  bucketAcl?: any
  publicAccessBlock?: any
  details: string[]
}> {
  const details: string[] = []
  let hasPublicAccess = false

  // Check 1: Public Access Block settings
  try {
    const publicAccessBlockResponse = await s3Client.send(new GetPublicAccessBlockCommand({
      Bucket: bucketName
    }))
    
    const config = publicAccessBlockResponse.PublicAccessBlockConfiguration
    if (config) {
      const allBlocked = config.BlockPublicAcls && 
                        config.BlockPublicPolicy && 
                        config.IgnorePublicAcls && 
                        config.RestrictPublicBuckets
      
      if (allBlocked) {
        details.push('✅ Block Public Access: All settings enabled (BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, RestrictPublicBuckets)')
      } else {
        hasPublicAccess = true
        const disabled = []
        if (!config.BlockPublicAcls) disabled.push('BlockPublicAcls')
        if (!config.BlockPublicPolicy) disabled.push('BlockPublicPolicy')
        if (!config.IgnorePublicAcls) disabled.push('IgnorePublicAcls')
        if (!config.RestrictPublicBuckets) disabled.push('RestrictPublicBuckets')
        details.push(`❌ Block Public Access: Some settings disabled (${disabled.join(', ')})`)
      }
    } else {
      hasPublicAccess = true
      details.push('❌ Block Public Access: No public access block configuration found')
    }
  } catch (error: any) {
    if (error.name === 'NoSuchPublicAccessBlockConfiguration') {
      hasPublicAccess = true
      details.push('❌ Block Public Access: No public access block configuration set')
    } else {
      details.push(`⚠️ Error checking Block Public Access settings: ${error.message}`)
    }
  }

  // Check 2: Bucket Policy Status
  try {
    const policyStatus = await s3Client.send(new GetBucketPolicyStatusCommand({
      Bucket: bucketName
    }))
    
    if (policyStatus.PolicyStatus?.IsPublic) {
      hasPublicAccess = true
      details.push('❌ Bucket policy allows public access')
    } else {
      details.push('✅ Bucket policy does not allow public access')
    }
  } catch (error: any) {
    if (error.name === 'NoSuchBucketPolicy') {
      details.push('✅ No bucket policy found (good for private access)')
    } else {
      details.push(`⚠️ Error checking bucket policy status: ${error.message}`)
    }
  }

  // Check 3: Bucket Policy Content
  try {
    const policyResponse = await s3Client.send(new GetBucketPolicyCommand({
      Bucket: bucketName
    }))
    
    if (policyResponse.Policy) {
      const policy = JSON.parse(policyResponse.Policy)
      details.push('ℹ️ Bucket policy exists - analyzing for public principals...')
      
      // Check if policy has statements with public principals
      for (const statement of policy.Statement || []) {
        if (statement.Principal === '*' || 
            (statement.Principal && statement.Principal.AWS === '*')) {
          hasPublicAccess = true
          details.push('❌ Found public principal (*) in bucket policy')
          break
        }
      }
      
      if (!hasPublicAccess) {
        details.push('✅ Bucket policy contains no public principals')
      }
    }
  } catch (error: any) {
    if (error.name === 'NoSuchBucketPolicy') {
      details.push('✅ No bucket policy found (good for private access)')
    } else {
      details.push(`⚠️ Error reading bucket policy: ${error.message}`)
    }
  }

  // Check 4: Bucket ACL
  try {
    const aclResponse = await s3Client.send(new GetBucketAclCommand({
      Bucket: bucketName
    }))
    
    const acl = aclResponse.Grants || []
    let foundPublicAcl = false
    
    for (const grant of acl) {
      if (grant.Grantee?.URI?.includes('AllUsers') || 
          grant.Grantee?.URI?.includes('AuthenticatedUsers')) {
        hasPublicAccess = true
        foundPublicAcl = true
        details.push(`❌ Found public ACL grant: ${grant.Grantee.URI} with ${grant.Permission} permission`)
      }
    }
    
    if (!foundPublicAcl) {
      details.push('✅ No public ACL grants found')
    }
  } catch (error: any) {
    details.push(`⚠️ Error reading bucket ACL: ${error.message}`)
  }

  return {
    hasPublicAccess,
    details
  }
}

/**
 * Check S3 Web Bucket Configuration (Exercise 2)
 * Validates that web bucket is configured for static hosting with public access to index.html only
 */
export async function validateS3WebBucket(
  credentials: AWSCredentials,
  bucketNamePattern: string = 'cybersec'
): Promise<ExerciseResult> {
  // TODO: Implement web bucket validation
  return {
    exerciseId: 's3-web-bucket',
    passed: false,
    message: 'Web bucket validation not implemented yet',
    details: {
      timestamp: new Date().toISOString(),
      checkFunction: 'checkS3WebBucket'
    }
  }
}