import { EC2Client, DescribeSecurityGroupsCommand, DescribeVpcsCommand, SecurityGroup, IpPermission } from '@aws-sdk/client-ec2';
import { ExerciseResult, AWSCredentials, TestCondition } from '../../shared/types.js';

interface SecurityGroupValidation {
  name: string;
  groupId?: string;
  found: boolean;
  rules: {
    expected: string[];
    actual: string[];
    valid: boolean;
  };
}

export async function validateSecurityGroups(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const ec2 = new EC2Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  });

  try {
    // First, find the VPC with cybersec project tags
    const vpcsCommand = new DescribeVpcsCommand({
      Filters: [
        {
          Name: 'tag:proyecto',
          Values: ['cybersec']
        },
        {
          Name: 'tag:funcion',
          Values: ['red']
        }
      ]
    });
    
    const vpcsResponse = await ec2.send(vpcsCommand);
    const projectVpcs = vpcsResponse.Vpcs || [];
    
    if (projectVpcs.length === 0) {
      const testResults: TestCondition[] = [{
        name: 'vpc-discovery',
        description: 'Locate VPC with cybersecurity project tags',
        status: 'fail',
        message: 'No VPC found with required tags (proyecto=cybersec, funcion=red)',
        details: 'Security groups validation requires a VPC with proper project tags to identify the target environment'
      }];
      
      return {
        exerciseId: 'security-groups',
        passed: false,
        message: 'No VPC found with proyecto=cybersec tags',
        testResults,
        details: {
          error: 'VPC with required tags not found. Please ensure VPC is tagged correctly.'
        }
      };
    }
    
    const projectVpcId = projectVpcs[0].VpcId;
    
    // Get all security groups in the project VPC
    const sgResponse = await ec2.send(new DescribeSecurityGroupsCommand({
      Filters: [
        {
          Name: 'vpc-id',
          Values: [projectVpcId!]
        }
      ]
    }));

    const securityGroups = sgResponse.SecurityGroups || [];

    // Validate each required security group
    const albsgValidation = validateAlbsg(securityGroups);
    const appsgValidation = validateAppsg(securityGroups, albsgValidation.groupId);
    const bdsgValidation = validateBdsg(securityGroups, appsgValidation.groupId);

    const allValid = albsgValidation.rules.valid && 
                    appsgValidation.rules.valid && 
                    bdsgValidation.rules.valid &&
                    albsgValidation.found &&
                    appsgValidation.found &&
                    bdsgValidation.found;

    // Create test results for each security group
    const testResults: TestCondition[] = [
      {
        name: 'albsg-validation',
        description: 'Load Balancer Security Group (albsg) - Internet facing entry point',
        status: albsgValidation.found && albsgValidation.rules.valid ? 'pass' : 'fail',
        message: albsgValidation.found 
          ? (albsgValidation.rules.valid ? 'Properly configured for web traffic' : 'Configuration issues found')
          : 'Security group not found',
        details: `Expected: HTTP:80 and HTTPS:443 from 0.0.0.0/0\nFound: ${albsgValidation.rules.actual.join(', ')}`
      },
      {
        name: 'appsg-validation',
        description: 'Application Security Group (appsg) - Private tier for application logic',
        status: appsgValidation.found && appsgValidation.rules.valid ? 'pass' : 'fail',
        message: appsgValidation.found 
          ? (appsgValidation.rules.valid ? 'Properly isolated - accepts only from ALB' : 'Configuration issues found')
          : 'Security group not found',
        details: `Expected: TCP:8080 from albsg only\nFound: ${appsgValidation.rules.actual.join(', ')}`
      },
      {
        name: 'bdsg-validation',
        description: 'Database Security Group (bdsg) - Internal tier for data protection',
        status: bdsgValidation.found && bdsgValidation.rules.valid ? 'pass' : 'fail',
        message: bdsgValidation.found 
          ? (bdsgValidation.rules.valid ? 'Maximum protection - accepts only from app tier' : 'Configuration issues found')
          : 'Security group not found',
        details: `Expected: TCP:5432 from appsg only\nFound: ${bdsgValidation.rules.actual.join(', ')}`
      },
      {
        name: 'microsegmentation-chain',
        description: 'Complete microsegmentation chain validation',
        status: allValid ? 'pass' : 'fail',
        message: allValid 
          ? 'Defense in depth implemented: Internet → ALB → App → Database'
          : 'Microsegmentation chain has weaknesses',
        details: `Chain analysis:\n• Internet → ALB: ${albsgValidation.rules.valid ? '✅' : '❌'}\n• ALB → App: ${appsgValidation.rules.valid ? '✅' : '❌'}\n• App → DB: ${bdsgValidation.rules.valid ? '✅' : '❌'}`
      }
    ];

    return {
      exerciseId: 'security-groups',
      passed: allValid,
      message: allValid 
        ? 'Security groups microsegmentation implemented correctly with proper tier isolation'
        : `Security groups configuration issues found: ${[
            !albsgValidation.found ? 'albsg missing' : !albsgValidation.rules.valid ? 'albsg rules' : '',
            !appsgValidation.found ? 'appsg missing' : !appsgValidation.rules.valid ? 'appsg rules' : '',
            !bdsgValidation.found ? 'bdsg missing' : !bdsgValidation.rules.valid ? 'bdsg rules' : ''
          ].filter(Boolean).join(', ')}`,
      testResults,
      details: {
        vpcId: projectVpcId,
        totalSecurityGroups: securityGroups.length,
        summary: `Validated 3 security groups in VPC ${projectVpcId}. Microsegmentation score: ${[albsgValidation.rules.valid, appsgValidation.rules.valid, bdsgValidation.rules.valid].filter(Boolean).length}/3`
      }
    };

  } catch (error) {
    console.error('Error validating security groups:', error);
    
    const testResults: TestCondition[] = [{
      name: 'validation-error',
      description: 'Security groups validation process',
      status: 'error',
      message: 'Failed to validate security groups due to AWS API error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }];
    
    return {
      exerciseId: 'security-groups',
      passed: false,
      message: 'Failed to validate security groups',
      testResults,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    };
  }
}

function validateAlbsg(securityGroups: SecurityGroup[]): SecurityGroupValidation {
  const albsg = securityGroups.find(sg => sg.GroupName === 'albsg');
  
  if (!albsg) {
    return {
      name: 'albsg',
      found: false,
      rules: {
        expected: ['HTTP (TCP:80) from 0.0.0.0/0', 'HTTPS (TCP:443) from 0.0.0.0/0'],
        actual: ['Security group not found'],
        valid: false
      }
    };
  }

  const inboundRules = albsg.IpPermissions || [];
  const actualRules: string[] = [];
  
  let hasHttp80 = false;
  let hasHttps443 = false;
  let extraRules: string[] = [];

  inboundRules.forEach(rule => {
    const protocol = rule.IpProtocol;
    const fromPort = rule.FromPort;
    const toPort = rule.ToPort;
    
    rule.IpRanges?.forEach(range => {
      const ruleDesc = `${protocol?.toUpperCase()}:${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from ${range.CidrIp}`;
      actualRules.push(ruleDesc);
      
      // Check for HTTP (port 80)
      if (protocol === 'tcp' && fromPort === 80 && toPort === 80 && range.CidrIp === '0.0.0.0/0') {
        hasHttp80 = true;
      }
      // Check for HTTPS (port 443) 
      else if (protocol === 'tcp' && fromPort === 443 && toPort === 443 && range.CidrIp === '0.0.0.0/0') {
        hasHttps443 = true;
      }
      // Track unexpected rules
      else if (!(protocol === 'tcp' && (fromPort === 80 || fromPort === 443) && range.CidrIp === '0.0.0.0/0')) {
        extraRules.push(ruleDesc);
      }
    });

    // Also check for security group references (should not exist for ALB)
    rule.UserIdGroupPairs?.forEach(groupPair => {
      const ruleDesc = `${protocol?.toUpperCase()}:${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from SG:${groupPair.GroupId}`;
      actualRules.push(ruleDesc);
      extraRules.push(ruleDesc + ' (unexpected - ALB should only accept from internet)');
    });
  });

  if (!hasHttp80) actualRules.push('❌ Missing: HTTP (TCP:80) from 0.0.0.0/0');
  if (!hasHttps443) actualRules.push('❌ Missing: HTTPS (TCP:443) from 0.0.0.0/0');
  if (extraRules.length > 0) {
    actualRules.push('⚠️ Unexpected rules found:');
    extraRules.forEach(rule => actualRules.push(`   ${rule}`));
  }

  return {
    name: 'albsg',
    groupId: albsg.GroupId,
    found: true,
    rules: {
      expected: ['HTTP (TCP:80) from 0.0.0.0/0', 'HTTPS (TCP:443) from 0.0.0.0/0'],
      actual: actualRules,
      valid: hasHttp80 && hasHttps443 && extraRules.length === 0
    }
  };
}

function validateAppsg(securityGroups: SecurityGroup[], albsgId?: string): SecurityGroupValidation {
  const appsg = securityGroups.find(sg => sg.GroupName === 'appsg');
  
  if (!appsg) {
    return {
      name: 'appsg',
      found: false,
      rules: {
        expected: ['TCP:8080 from albsg only'],
        actual: ['Security group not found'],
        valid: false
      }
    };
  }

  const inboundRules = appsg.IpPermissions || [];
  const actualRules: string[] = [];
  
  let hasPort8080FromAlbsg = false;
  let hasInvalidRules: string[] = [];

  if (!albsgId) {
    actualRules.push('⚠️ Cannot validate: albsg not found, cannot check references');
  }

  inboundRules.forEach(rule => {
    const protocol = rule.IpProtocol;
    const fromPort = rule.FromPort;
    const toPort = rule.ToPort;
    
    // Check IP ranges (should not exist for app tier)
    rule.IpRanges?.forEach(range => {
      const ruleDesc = `${protocol?.toUpperCase()}:${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from ${range.CidrIp}`;
      actualRules.push(ruleDesc);
      hasInvalidRules.push(ruleDesc + ' (invalid - app should only accept from ALB)');
    });
    
    // Check security group references
    rule.UserIdGroupPairs?.forEach(groupPair => {
      const sourceDesc = groupPair.GroupId === albsgId ? 'albsg' : `SG:${groupPair.GroupId}`;
      const ruleDesc = `${protocol?.toUpperCase()}:${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from ${sourceDesc}`;
      actualRules.push(ruleDesc);
      
      // Check for port 8080 from albsg
      if (protocol === 'tcp' && fromPort === 8080 && toPort === 8080 && groupPair.GroupId === albsgId) {
        hasPort8080FromAlbsg = true;
      }
      // Track invalid source security groups
      else if (groupPair.GroupId !== albsgId) {
        hasInvalidRules.push(ruleDesc + ' (invalid - should only accept from albsg)');
      }
      // Track invalid ports from albsg
      else if (protocol !== 'tcp' || fromPort !== 8080 || toPort !== 8080) {
        hasInvalidRules.push(ruleDesc + ' (invalid - wrong port, should be TCP:8080)');
      }
    });
  });

  if (!hasPort8080FromAlbsg && albsgId) {
    actualRules.push('❌ Missing: TCP:8080 from albsg');
  }

  if (hasInvalidRules.length > 0) {
    actualRules.push('⚠️ Invalid rules found:');
    hasInvalidRules.forEach(rule => actualRules.push(`   ${rule}`));
  }

  return {
    name: 'appsg',
    groupId: appsg.GroupId,
    found: true,
    rules: {
      expected: ['TCP:8080 from albsg only (no direct internet access)'],
      actual: actualRules,
      valid: hasPort8080FromAlbsg && albsgId !== undefined && hasInvalidRules.length === 0
    }
  };
}

function validateBdsg(securityGroups: SecurityGroup[], appsgId?: string): SecurityGroupValidation {
  const bdsg = securityGroups.find(sg => sg.GroupName === 'bdsg');
  
  if (!bdsg) {
    return {
      name: 'bdsg',
      found: false,
      rules: {
        expected: ['TCP:5432 from appsg only'],
        actual: ['Security group not found'],
        valid: false
      }
    };
  }

  const inboundRules = bdsg.IpPermissions || [];
  const actualRules: string[] = [];
  
  let hasPort5432FromAppsg = false;
  let hasInvalidRules: string[] = [];

  if (!appsgId) {
    actualRules.push('⚠️ Cannot validate: appsg not found, cannot check references');
  }

  inboundRules.forEach(rule => {
    const protocol = rule.IpProtocol;
    const fromPort = rule.FromPort;
    const toPort = rule.ToPort;
    
    // Check IP ranges (should not exist for database tier)
    rule.IpRanges?.forEach(range => {
      const ruleDesc = `${protocol?.toUpperCase()}:${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from ${range.CidrIp}`;
      actualRules.push(ruleDesc);
      hasInvalidRules.push(ruleDesc + ' (invalid - database should only accept from app tier)');
    });
    
    // Check security group references
    rule.UserIdGroupPairs?.forEach(groupPair => {
      const sourceDesc = groupPair.GroupId === appsgId ? 'appsg' : `SG:${groupPair.GroupId}`;
      const ruleDesc = `${protocol?.toUpperCase()}:${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from ${sourceDesc}`;
      actualRules.push(ruleDesc);
      
      // Check for port 5432 from appsg
      if (protocol === 'tcp' && fromPort === 5432 && toPort === 5432 && groupPair.GroupId === appsgId) {
        hasPort5432FromAppsg = true;
      }
      // Track invalid source security groups
      else if (groupPair.GroupId !== appsgId) {
        hasInvalidRules.push(ruleDesc + ' (invalid - should only accept from appsg)');
      }
      // Track invalid ports from appsg
      else if (protocol !== 'tcp' || fromPort !== 5432 || toPort !== 5432) {
        hasInvalidRules.push(ruleDesc + ' (invalid - wrong port, should be TCP:5432 for PostgreSQL)');
      }
    });
  });

  if (!hasPort5432FromAppsg && appsgId) {
    actualRules.push('❌ Missing: TCP:5432 from appsg');
  }

  if (hasInvalidRules.length > 0) {
    actualRules.push('⚠️ Invalid rules found:');
    hasInvalidRules.forEach(rule => actualRules.push(`   ${rule}`));
  }

  return {
    name: 'bdsg',
    groupId: bdsg.GroupId,
    found: true,
    rules: {
      expected: ['TCP:5432 from appsg only (no internet or ALB access)'],
      actual: actualRules,
      valid: hasPort5432FromAppsg && appsgId !== undefined && hasInvalidRules.length === 0
    }
  };
}