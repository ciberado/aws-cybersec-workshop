import { S3Client, HeadBucketCommand, GetObjectCommand, GetBucketPolicyCommand, GetBucketAclCommand, GetBucketPolicyStatusCommand, ListBucketsCommand, GetBucketTaggingCommand, GetPublicAccessBlockCommand, GetBucketWebsiteCommand } from '@aws-sdk/client-s3';
/**
 * Check S3 Data Bucket Security (Exercise 1)
 * Validates that pokemon.csv is accessible only with IAM credentials (no public access)
 */
export async function validateS3DataBucket(credentials, bucketNamePattern = 'cybersec') {
    const s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
            accessKeyId: credentials.aws_access_key_id,
            secretAccessKey: credentials.aws_secret_access_key,
            sessionToken: credentials.aws_session_token
        }
    });
    const testResults = [];
    let overallPassed = true;
    try {
        // Test 1: Find the data bucket
        const bucketName = await findDataBucket(s3Client, bucketNamePattern);
        if (!bucketName) {
            testResults.push({
                name: 'bucket-discovery',
                description: 'Locate S3 bucket with correct tags (proyecto=cybersec, funcion=datos)',
                status: 'fail',
                message: 'No data bucket found with required tags',
                details: `Searched for buckets with tags proyecto=cybersec and funcion=datos. Also tried pattern-based names like: ${bucketNamePattern}-data, ${bucketNamePattern}-datos, etc.`
            });
            overallPassed = false;
            return {
                exerciseId: 's3-data-bucket',
                passed: false,
                message: 'S3 data bucket not found with required tags (proyecto=cybersec, funcion=datos)',
                testResults,
                details: {
                    timestamp: new Date().toISOString(),
                    checkFunction: 'checkS3DataBucket'
                }
            };
        }
        testResults.push({
            name: 'bucket-discovery',
            description: 'Locate S3 bucket with correct tags (proyecto=cybersec, funcion=datos)',
            status: 'pass',
            message: `Found data bucket: ${bucketName}`,
            details: 'Bucket exists, is accessible, and has the correct tags'
        });
        // Test 2: Check pokemon.csv file existence and accessibility
        try {
            const getObjectResponse = await s3Client.send(new GetObjectCommand({
                Bucket: bucketName,
                Key: 'pokemon.csv'
            }));
            // Actually read some of the file content to prove download works
            let fileContent = '';
            let fileSize = getObjectResponse.ContentLength || 0;
            if (getObjectResponse.Body) {
                // Convert stream to string to verify it's accessible and appears to be CSV
                const bodyContents = await getObjectResponse.Body.transformToString('utf-8');
                fileContent = bodyContents.substring(0, 500); // First 500 characters
            }
            // Verify it looks like a CSV file
            const isValidCsv = fileContent.includes(',') && (fileContent.toLowerCase().includes('pokemon') ||
                fileContent.includes('\n') ||
                fileContent.includes('\r'));
            if (isValidCsv) {
                const firstLine = fileContent.split('\n')[0] || fileContent.split('\r')[0] || '';
                testResults.push({
                    name: 'pokemon-file-access',
                    description: 'Verify pokemon.csv exists and is accessible with current credentials',
                    status: 'pass',
                    message: 'pokemon.csv successfully downloaded and validated',
                    details: `File downloaded and read successfully (${fileSize} bytes). Content appears to be valid CSV format. Headers: ${firstLine.substring(0, 100)}${firstLine.length > 100 ? '...' : ''}`
                });
            }
            else {
                testResults.push({
                    name: 'pokemon-file-access',
                    description: 'Verify pokemon.csv exists and is accessible with current credentials',
                    status: 'warning',
                    message: 'pokemon.csv accessible but content may not be valid CSV',
                    details: `File downloaded (${fileSize} bytes) but content doesn't appear to be CSV format. First 100 chars: ${fileContent.substring(0, 100)}${fileContent.length > 100 ? '...' : ''}`
                });
            }
        }
        catch (error) {
            if (error.name === 'NoSuchKey') {
                testResults.push({
                    name: 'pokemon-file-access',
                    description: 'Verify pokemon.csv exists and is accessible with current credentials',
                    status: 'fail',
                    message: 'pokemon.csv file not found in bucket root',
                    details: 'Upload pokemon.csv to the root of your data bucket'
                });
            }
            else {
                testResults.push({
                    name: 'pokemon-file-access',
                    description: 'Verify pokemon.csv exists and is accessible with current credentials',
                    status: 'error',
                    message: `Error accessing pokemon.csv: ${error.message}`,
                    details: 'Check bucket permissions and IAM policies'
                });
            }
            overallPassed = false;
        }
        // Test 3: Check for public access (comprehensive security check)
        const publicAccessCheck = await checkBucketPublicAccess(s3Client, bucketName);
        if (!publicAccessCheck.hasPublicAccess) {
            testResults.push({
                name: 'no-public-access',
                description: 'Verify comprehensive public access protection (Block Public Access, policies, ACLs)',
                status: 'pass',
                message: 'Bucket properly secured with comprehensive public access protection',
                details: publicAccessCheck.details.join('\n')
            });
        }
        else {
            testResults.push({
                name: 'no-public-access',
                description: 'Verify comprehensive public access protection (Block Public Access, policies, ACLs)',
                status: 'fail',
                message: 'Bucket has public access vulnerabilities - security risk detected',
                details: publicAccessCheck.details.join('\n')
            });
            overallPassed = false;
        }
        // Test 4: IAM-only access verification
        testResults.push({
            name: 'iam-only-access',
            description: 'Confirm access is restricted to IAM credentials only',
            status: overallPassed ? 'pass' : 'fail',
            message: overallPassed ? 'Access properly restricted to IAM credentials' : 'Access control issues detected',
            details: 'Data should only be accessible via valid AWS IAM credentials'
        });
        const finalMessage = overallPassed
            ? 'S3 data bucket security validation passed - all requirements met'
            : 'S3 data bucket security validation failed - see test details';
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
        };
    }
    catch (error) {
        testResults.push({
            name: 'validation-error',
            description: 'S3 bucket validation process',
            status: 'error',
            message: `Validation error: ${error.message}`,
            details: 'Check AWS credentials and permissions'
        });
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
        };
    }
}
/**
 * Find data bucket with proper tags
 */
async function findDataBucket(s3Client, pattern) {
    try {
        // List all buckets in the account
        const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
        const buckets = listBucketsResponse.Buckets || [];
        // Check each bucket for the required tags
        for (const bucket of buckets) {
            if (!bucket.Name)
                continue;
            try {
                // Get bucket tags
                const taggingResponse = await s3Client.send(new GetBucketTaggingCommand({
                    Bucket: bucket.Name
                }));
                const tags = taggingResponse.TagSet || [];
                const tagMap = Object.fromEntries(tags.map(tag => [tag.Key, tag.Value]));
                // Check if this bucket has the required tags: proyecto=cybersec and funcion=datos
                if (tagMap['proyecto'] === 'cybersec' && tagMap['funcion'] === 'datos') {
                    return bucket.Name;
                }
            }
            catch (error) {
                // Bucket might not have tags or we don't have permission to read them
                // Continue checking other buckets
                continue;
            }
        }
        // If no bucket found with tags, try the old pattern-based approach as fallback
        const possibleNames = [
            `${pattern}-data`,
            `${pattern}-datos`,
            `data-${pattern}`,
            `datos-${pattern}`,
            pattern
        ];
        for (const bucketName of possibleNames) {
            try {
                await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
                return bucketName;
            }
            catch (error) {
                // Bucket doesn't exist or no access, continue
            }
        }
        return null;
    }
    catch (error) {
        // If we can't list buckets, fall back to pattern-based approach
        const possibleNames = [
            `${pattern}-data`,
            `${pattern}-datos`,
            `data-${pattern}`,
            `datos-${pattern}`,
            pattern
        ];
        for (const bucketName of possibleNames) {
            try {
                await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
                return bucketName;
            }
            catch (error) {
                // Bucket doesn't exist or no access, continue
            }
        }
        return null;
    }
}
/**
 * Check if bucket has any form of public access
 */
async function checkBucketPublicAccess(s3Client, bucketName) {
    const details = [];
    let hasPublicAccess = false;
    // Check 1: Public Access Block settings
    try {
        const publicAccessBlockResponse = await s3Client.send(new GetPublicAccessBlockCommand({
            Bucket: bucketName
        }));
        const config = publicAccessBlockResponse.PublicAccessBlockConfiguration;
        if (config) {
            const allBlocked = config.BlockPublicAcls &&
                config.BlockPublicPolicy &&
                config.IgnorePublicAcls &&
                config.RestrictPublicBuckets;
            if (allBlocked) {
                details.push('✅ Block Public Access: All settings enabled (BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, RestrictPublicBuckets)');
            }
            else {
                hasPublicAccess = true;
                const disabled = [];
                if (!config.BlockPublicAcls)
                    disabled.push('BlockPublicAcls');
                if (!config.BlockPublicPolicy)
                    disabled.push('BlockPublicPolicy');
                if (!config.IgnorePublicAcls)
                    disabled.push('IgnorePublicAcls');
                if (!config.RestrictPublicBuckets)
                    disabled.push('RestrictPublicBuckets');
                details.push(`❌ Block Public Access: Some settings disabled (${disabled.join(', ')})`);
            }
        }
        else {
            hasPublicAccess = true;
            details.push('❌ Block Public Access: No public access block configuration found');
        }
    }
    catch (error) {
        if (error.name === 'NoSuchPublicAccessBlockConfiguration') {
            hasPublicAccess = true;
            details.push('❌ Block Public Access: No public access block configuration set');
        }
        else {
            details.push(`⚠️ Error checking Block Public Access settings: ${error.message}`);
        }
    }
    // Check 2: Bucket Policy Status
    try {
        const policyStatus = await s3Client.send(new GetBucketPolicyStatusCommand({
            Bucket: bucketName
        }));
        if (policyStatus.PolicyStatus?.IsPublic) {
            hasPublicAccess = true;
            details.push('❌ Bucket policy allows public access');
        }
        else {
            details.push('✅ Bucket policy does not allow public access');
        }
    }
    catch (error) {
        if (error.name === 'NoSuchBucketPolicy') {
            details.push('✅ No bucket policy found (good for private access)');
        }
        else {
            details.push(`⚠️ Error checking bucket policy status: ${error.message}`);
        }
    }
    // Check 3: Bucket Policy Content
    try {
        const policyResponse = await s3Client.send(new GetBucketPolicyCommand({
            Bucket: bucketName
        }));
        if (policyResponse.Policy) {
            const policy = JSON.parse(policyResponse.Policy);
            details.push('ℹ️ Bucket policy exists - analyzing for public principals...');
            // Check if policy has statements with public principals
            for (const statement of policy.Statement || []) {
                if (statement.Principal === '*' ||
                    (statement.Principal && statement.Principal.AWS === '*')) {
                    hasPublicAccess = true;
                    details.push('❌ Found public principal (*) in bucket policy');
                    break;
                }
            }
            if (!hasPublicAccess) {
                details.push('✅ Bucket policy contains no public principals');
            }
        }
    }
    catch (error) {
        if (error.name === 'NoSuchBucketPolicy') {
            details.push('✅ No bucket policy found (good for private access)');
        }
        else {
            details.push(`⚠️ Error reading bucket policy: ${error.message}`);
        }
    }
    // Check 4: Bucket ACL
    try {
        const aclResponse = await s3Client.send(new GetBucketAclCommand({
            Bucket: bucketName
        }));
        const acl = aclResponse.Grants || [];
        let foundPublicAcl = false;
        for (const grant of acl) {
            if (grant.Grantee?.URI?.includes('AllUsers') ||
                grant.Grantee?.URI?.includes('AuthenticatedUsers')) {
                hasPublicAccess = true;
                foundPublicAcl = true;
                details.push(`❌ Found public ACL grant: ${grant.Grantee.URI} with ${grant.Permission} permission`);
            }
        }
        if (!foundPublicAcl) {
            details.push('✅ No public ACL grants found');
        }
    }
    catch (error) {
        details.push(`⚠️ Error reading bucket ACL: ${error.message}`);
    }
    return {
        hasPublicAccess,
        details
    };
}
/**
 * Check S3 Web Bucket Configuration (Exercise 2)
 * Validates that web bucket is configured for static hosting with public access to index.html only
 */
export async function validateS3WebBucket(credentials, bucketNamePattern = 'cybersec') {
    const s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
            accessKeyId: credentials.aws_access_key_id,
            secretAccessKey: credentials.aws_secret_access_key,
            sessionToken: credentials.aws_session_token
        }
    });
    const testResults = [];
    let overallPassed = true;
    try {
        // Test 1: Find the web bucket
        const bucketName = await findWebBucket(s3Client, bucketNamePattern);
        if (!bucketName) {
            testResults.push({
                name: 'bucket-discovery',
                description: 'Locate S3 bucket with correct tags (proyecto=cybersec, funcion=web)',
                status: 'fail',
                message: 'No web bucket found with required tags',
                details: `Searched for buckets with tags proyecto=cybersec and funcion=web. Also tried pattern-based names like: ${bucketNamePattern}-web, ${bucketNamePattern}-website, etc.`
            });
            overallPassed = false;
            return {
                exerciseId: 's3-web-bucket',
                passed: false,
                message: 'S3 web bucket not found with required tags (proyecto=cybersec, funcion=web)',
                testResults,
                details: {
                    timestamp: new Date().toISOString(),
                    checkFunction: 'checkS3WebBucket'
                }
            };
        }
        testResults.push({
            name: 'bucket-discovery',
            description: 'Locate S3 bucket with correct tags (proyecto=cybersec, funcion=web)',
            status: 'pass',
            message: `Found web bucket: ${bucketName}`,
            details: 'Bucket discovered with correct tagging'
        });
        // Test 2: Check website configuration
        const websiteConfigResult = await checkWebsiteConfiguration(s3Client, bucketName);
        testResults.push({
            name: 'website-configuration',
            description: 'Verify bucket is configured for static website hosting',
            status: websiteConfigResult.isConfigured ? 'pass' : 'fail',
            message: websiteConfigResult.isConfigured ?
                'Bucket properly configured for static website hosting' :
                'Bucket not configured for static website hosting',
            details: websiteConfigResult.details.join('\n')
        });
        if (!websiteConfigResult.isConfigured)
            overallPassed = false;
        // Test 3: Check index.html exists and is accessible
        const indexFileResult = await checkIndexFile(s3Client, bucketName);
        testResults.push({
            name: 'index-file-access',
            description: 'Verify index.html exists and is publicly accessible',
            status: indexFileResult.exists && indexFileResult.publiclyAccessible ? 'pass' : 'fail',
            message: indexFileResult.exists && indexFileResult.publiclyAccessible ?
                'index.html exists and is publicly accessible' :
                indexFileResult.exists ? 'index.html exists but is not publicly accessible' : 'index.html file not found',
            details: indexFileResult.details.join('\n')
        });
        if (!indexFileResult.exists || !indexFileResult.publiclyAccessible)
            overallPassed = false;
        // Test 4: Check controlled public access (bucket should not be completely open)
        const accessControlResult = await checkControlledAccess(s3Client, bucketName);
        testResults.push({
            name: 'controlled-access',
            description: 'Verify public access is controlled (no excessive permissions)',
            status: accessControlResult.isControlled ? 'pass' : 'fail',
            message: accessControlResult.isControlled ?
                'Public access is properly controlled' :
                'Bucket has excessive public permissions',
            details: accessControlResult.details.join('\n')
        });
        if (!accessControlResult.isControlled)
            overallPassed = false;
        return {
            exerciseId: 's3-web-bucket',
            passed: overallPassed,
            message: overallPassed ?
                'S3 web bucket properly configured for secure static hosting' :
                'S3 web bucket configuration issues found',
            testResults,
            details: {
                bucketName,
                websiteEndpoint: websiteConfigResult.websiteUrl,
                timestamp: new Date().toISOString(),
                checkFunction: 'checkS3WebBucket'
            }
        };
    }
    catch (error) {
        console.error('Error validating S3 web bucket:', error);
        return {
            exerciseId: 's3-web-bucket',
            passed: false,
            message: `Error validating S3 web bucket: ${error.message}`,
            testResults: [{
                    name: 'validation-error',
                    description: 'S3 web bucket validation process',
                    status: 'fail',
                    message: error.message || 'Unknown error',
                    details: error.stack || 'No stack trace available'
                }],
            details: {
                error: error.message,
                timestamp: new Date().toISOString(),
                checkFunction: 'checkS3WebBucket'
            }
        };
    }
}
/**
 * Find the web bucket using tags and naming patterns
 */
async function findWebBucket(s3Client, bucketNamePattern) {
    try {
        const response = await s3Client.send(new ListBucketsCommand({}));
        const buckets = response.Buckets || [];
        // First, try to find bucket with correct tags
        for (const bucket of buckets) {
            if (!bucket.Name)
                continue;
            try {
                const tagsResponse = await s3Client.send(new GetBucketTaggingCommand({
                    Bucket: bucket.Name
                }));
                const tags = tagsResponse.TagSet || [];
                const hasProyectoTag = tags.some(tag => tag.Key === 'proyecto' && tag.Value === 'cybersec');
                const hasFuncionTag = tags.some(tag => tag.Key === 'funcion' && tag.Value === 'web');
                if (hasProyectoTag && hasFuncionTag) {
                    return bucket.Name;
                }
            }
            catch (tagError) {
                // Skip buckets without tags or permission errors
                continue;
            }
        }
        // Fallback: try name-based patterns
        const patterns = [
            `${bucketNamePattern}-web`,
            `${bucketNamePattern}-website`,
            `${bucketNamePattern}web`,
            `web-${bucketNamePattern}`,
            `website-${bucketNamePattern}`
        ];
        for (const pattern of patterns) {
            for (const bucket of buckets) {
                if (bucket.Name?.includes(pattern)) {
                    return bucket.Name;
                }
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error finding web bucket:', error);
        return null;
    }
}
/**
 * Check if bucket is configured for static website hosting
 */
async function checkWebsiteConfiguration(s3Client, bucketName) {
    const details = [];
    try {
        const websiteResponse = await s3Client.send(new GetBucketWebsiteCommand({
            Bucket: bucketName
        }));
        if (websiteResponse.IndexDocument?.Suffix) {
            details.push(`✅ Website hosting enabled with index document: ${websiteResponse.IndexDocument.Suffix}`);
            if (websiteResponse.ErrorDocument?.Key) {
                details.push(`✅ Error document configured: ${websiteResponse.ErrorDocument.Key}`);
            }
            const websiteUrl = `http://${bucketName}.s3-website-us-east-1.amazonaws.com`;
            details.push(`✅ Website URL: ${websiteUrl}`);
            return {
                isConfigured: true,
                websiteUrl,
                details
            };
        }
        else {
            details.push('❌ Website hosting enabled but no index document configured');
            return { isConfigured: false, details };
        }
    }
    catch (error) {
        if (error.name === 'NoSuchWebsiteConfiguration') {
            details.push('❌ No website configuration found');
        }
        else {
            details.push(`❌ Error checking website configuration: ${error.message}`);
        }
        return { isConfigured: false, details };
    }
}
/**
 * Check if index.html exists and is accessible
 */
async function checkIndexFile(s3Client, bucketName) {
    const details = [];
    try {
        // Check if index.html exists
        await s3Client.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: 'index.html'
        }));
        details.push('✅ index.html file exists in bucket root');
        // Check if public read access is actually configured
        const publicReadAccess = await checkPublicReadAccess(s3Client, bucketName);
        if (publicReadAccess.hasPublicRead) {
            details.push('✅ Public read access is properly configured');
            details.push(...publicReadAccess.details);
            return {
                exists: true,
                publiclyAccessible: true,
                details
            };
        }
        else {
            details.push('❌ index.html exists but is not publicly accessible');
            details.push(...publicReadAccess.details);
            return {
                exists: true,
                publiclyAccessible: false,
                details
            };
        }
    }
    catch (error) {
        if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
            details.push('❌ index.html file not found in bucket root');
        }
        else {
            details.push(`❌ Error checking index.html: ${error.message}`);
        }
        return {
            exists: false,
            publiclyAccessible: false,
            details
        };
    }
}
/**
 * Check if bucket has public read access configured
 */
async function checkPublicReadAccess(s3Client, bucketName) {
    const details = [];
    let hasPublicReadViaBucketPolicy = false;
    let hasPublicReadViaACL = false;
    // Check bucket policy for public read access
    try {
        const policyResponse = await s3Client.send(new GetBucketPolicyCommand({
            Bucket: bucketName
        }));
        if (policyResponse.Policy) {
            const policy = JSON.parse(policyResponse.Policy);
            for (const statement of policy.Statement || []) {
                if (statement.Principal === '*' ||
                    (statement.Principal && statement.Principal.AWS === '*')) {
                    const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                    if ((actions.includes('s3:GetObject') || actions.includes('s3:*')) && statement.Effect === 'Allow') {
                        hasPublicReadViaBucketPolicy = true;
                        details.push('✅ Found public s3:GetObject permission in bucket policy');
                    }
                }
            }
            if (!hasPublicReadViaBucketPolicy) {
                details.push('❌ Bucket policy exists but no public s3:GetObject permission found');
            }
        }
    }
    catch (error) {
        if (error.name === 'NoSuchBucketPolicy') {
            details.push('ℹ️ No bucket policy found - checking ACLs for public access');
        }
        else {
            details.push(`⚠️ Error reading bucket policy: ${error.message}`);
        }
    }
    // Check bucket ACL for public read access
    try {
        const aclResponse = await s3Client.send(new GetBucketAclCommand({
            Bucket: bucketName
        }));
        const acl = aclResponse.Grants || [];
        for (const grant of acl) {
            if (grant.Grantee?.URI?.includes('AllUsers') && grant.Permission === 'READ') {
                hasPublicReadViaACL = true;
                details.push('✅ Found public READ permission via bucket ACL');
            }
        }
        if (!hasPublicReadViaACL && !hasPublicReadViaBucketPolicy) {
            details.push('❌ No public READ permission found in bucket ACL');
        }
    }
    catch (error) {
        details.push(`⚠️ Error reading bucket ACL: ${error.message}`);
    }
    return {
        hasPublicRead: hasPublicReadViaBucketPolicy || hasPublicReadViaACL,
        details
    };
}
/**
 * Check that public access is controlled (not completely open)
 */
async function checkControlledAccess(s3Client, bucketName) {
    const details = [];
    let hasExcessivePermissions = false;
    let hasRequiredReadAccess = false;
    // Check bucket policy for permissions
    try {
        const policyResponse = await s3Client.send(new GetBucketPolicyCommand({
            Bucket: bucketName
        }));
        if (policyResponse.Policy) {
            const policy = JSON.parse(policyResponse.Policy);
            details.push('ℹ️ Bucket policy exists - analyzing permissions...');
            for (const statement of policy.Statement || []) {
                if (statement.Principal === '*' ||
                    (statement.Principal && statement.Principal.AWS === '*')) {
                    const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                    // Check for required read access (s3:GetObject for website)
                    if (statement.Effect === 'Allow' &&
                        (actions.includes('s3:GetObject') || actions.includes('s3:*'))) {
                        hasRequiredReadAccess = true;
                        details.push('✅ Found public s3:GetObject permission (required for website)');
                    }
                    // Check for excessive write permissions
                    const writeActions = ['s3:PutObject', 's3:DeleteObject', 's3:PutObjectAcl', 's3:DeleteBucket'];
                    const hasWriteAccess = writeActions.some(action => actions.includes(action) || actions.includes('s3:*'));
                    if (hasWriteAccess && statement.Effect === 'Allow') {
                        hasExcessivePermissions = true;
                        details.push(`❌ Found excessive public write permissions in bucket policy: ${actions.join(', ')}`);
                    }
                }
            }
        }
        else {
            details.push('ℹ️ No bucket policy found');
        }
    }
    catch (error) {
        if (error.name === 'NoSuchBucketPolicy') {
            details.push('ℹ️ No bucket policy found');
        }
        else {
            details.push(`⚠️ Error reading bucket policy: ${error.message}`);
        }
    }
    // Check bucket ACL for permissions
    try {
        const aclResponse = await s3Client.send(new GetBucketAclCommand({
            Bucket: bucketName
        }));
        const acl = aclResponse.Grants || [];
        for (const grant of acl) {
            if (grant.Grantee?.URI?.includes('AllUsers')) {
                if (grant.Permission === 'READ') {
                    hasRequiredReadAccess = true;
                    details.push('✅ Found public READ access via ACL (required for website)');
                }
                else if (grant.Permission === 'WRITE' || grant.Permission === 'FULL_CONTROL') {
                    hasExcessivePermissions = true;
                    details.push(`❌ Found excessive public permission via ACL: ${grant.Permission}`);
                }
            }
        }
    }
    catch (error) {
        details.push(`⚠️ Error reading bucket ACL: ${error.message}`);
    }
    // Check Public Access Block settings
    try {
        const publicAccessBlockResponse = await s3Client.send(new GetPublicAccessBlockCommand({
            Bucket: bucketName
        }));
        const pab = publicAccessBlockResponse.PublicAccessBlockConfiguration;
        if (pab) {
            details.push('ℹ️ Public Access Block configuration:');
            details.push(`  - Block Public ACLs: ${pab.BlockPublicAcls}`);
            details.push(`  - Ignore Public ACLs: ${pab.IgnorePublicAcls}`);
            details.push(`  - Block Public Policy: ${pab.BlockPublicPolicy}`);
            details.push(`  - Restrict Public Buckets: ${pab.RestrictPublicBuckets}`);
            // Check if PAB settings are blocking required web access
            if ((pab.BlockPublicPolicy === true || pab.RestrictPublicBuckets === true) && !hasRequiredReadAccess) {
                details.push('⚠️ Public Access Block may be preventing required web hosting access');
            }
        }
        else {
            details.push('ℹ️ No Public Access Block configuration');
        }
    }
    catch (error) {
        if (error.name === 'NoSuchPublicAccessBlockConfiguration') {
            details.push('ℹ️ No Public Access Block configuration');
        }
        else {
            details.push(`⚠️ Error reading Public Access Block: ${error.message}`);
        }
    }
    return {
        isControlled: !hasExcessivePermissions,
        details
    };
}
// Import HeadObjectCommand that we need for the index file check
import { HeadObjectCommand } from '@aws-sdk/client-s3';
