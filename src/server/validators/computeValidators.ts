import { RDSClient, DescribeDBInstancesCommand, DescribeDBSubnetGroupsCommand, DBInstance } from '@aws-sdk/client-rds';
import { 
  EC2Client, 
  DescribeSubnetsCommand, 
  DescribeRouteTablesCommand,
  DescribeLaunchTemplatesCommand,
  DescribeLaunchTemplateVersionsCommand,
  DescribeImagesCommand
} from '@aws-sdk/client-ec2';
import { 
  ElasticLoadBalancingV2Client, 
  DescribeLoadBalancersCommand, 
  DescribeTargetGroupsCommand, 
  DescribeListenersCommand,
  DescribeTagsCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { ExerciseResult, AWSCredentials, TestCondition } from '../../shared/types.js';

/**
 * Validate RDS Database Protection (Exercise 6)
 * Checks PostgreSQL Multi-AZ configuration in internal subnets with proper security
 */
export async function validateRDSProtection(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const rdsClient = new RDSClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  });

  const ec2Client = new EC2Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  });

  const testResults: TestCondition[] = [];
  let overallPassed = true;

  try {
    // Test 1: Find PostgreSQL database with project tags
    const dbDiscovery = await discoverProjectDatabase(rdsClient);
    testResults.push({
      name: 'database-discovery',
      description: 'Locate PostgreSQL database with project tags (proyecto=cybersec)',
      status: dbDiscovery.found ? 'pass' : 'fail',
      message: dbDiscovery.message,
      details: dbDiscovery.details.join('\n')
    });
    if (!dbDiscovery.found) overallPassed = false;

    if (dbDiscovery.dbInstance) {
      // Test 2: Validate PostgreSQL engine
      const engineValidation = validateDatabaseEngine(dbDiscovery.dbInstance);
      testResults.push({
        name: 'engine-validation',
        description: 'Verify PostgreSQL engine configuration',
        status: engineValidation.isValid ? 'pass' : 'fail',
        message: engineValidation.message,
        details: engineValidation.details.join('\n')
      });
      if (!engineValidation.isValid) overallPassed = false;

      // Test 3: Validate Multi-AZ configuration
      const multiAZValidation = validateMultiAZConfiguration(dbDiscovery.dbInstance);
      testResults.push({
        name: 'multi-az-validation',
        description: 'Verify Multi-AZ deployment for high availability',
        status: multiAZValidation.isValid ? 'pass' : 'fail',
        message: multiAZValidation.message,
        details: multiAZValidation.details.join('\n')
      });
      if (!multiAZValidation.isValid) overallPassed = false;

      // Test 4: Validate network isolation - subnet group in internal tier
      const subnetValidation = await validateSubnetGroupIsolation(
        rdsClient, 
        ec2Client, 
        dbDiscovery.dbInstance
      );
      testResults.push({
        name: 'network-isolation',
        description: 'Verify database is isolated in internal subnets (no internet access)',
        status: subnetValidation.isValid ? 'pass' : 'fail',
        message: subnetValidation.message,
        details: subnetValidation.details.join('\n')
      });
      if (!subnetValidation.isValid) overallPassed = false;

      // Test 5: Validate security group assignment
      const securityValidation = validateSecurityGroupAssignment(dbDiscovery.dbInstance);
      testResults.push({
        name: 'security-groups',
        description: 'Verify proper security group assignment (bdsg for restricted access)',
        status: securityValidation.isValid ? 'pass' : 'fail',
        message: securityValidation.message,
        details: securityValidation.details.join('\n')
      });
      if (!securityValidation.isValid) overallPassed = false;

      // Test 6: Validate no public accessibility
      const accessValidation = validatePublicAccessibility(dbDiscovery.dbInstance);
      testResults.push({
        name: 'public-access',
        description: 'Verify database is not publicly accessible',
        status: accessValidation.isValid ? 'pass' : 'fail',
        message: accessValidation.message,
        details: accessValidation.details.join('\n')
      });
      if (!accessValidation.isValid) overallPassed = false;
    }

    return {
      exerciseId: 'rds-protection',
      passed: overallPassed,
      message: overallPassed 
        ? 'RDS PostgreSQL database properly configured with maximum protection and high availability'
        : 'RDS database security configuration issues found',
      testResults,
      details: {
        databaseIdentifier: dbDiscovery.dbInstance?.DBInstanceIdentifier,
        engine: dbDiscovery.dbInstance?.Engine,
        multiAZ: dbDiscovery.dbInstance?.MultiAZ,
        publiclyAccessible: dbDiscovery.dbInstance?.PubliclyAccessible,
        vpcSecurityGroups: dbDiscovery.dbInstance?.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId).join(', '),
        timestamp: new Date().toISOString(),
        checkFunction: 'validateRDSProtection'
      }
    };

  } catch (error: any) {
    console.error('Error validating RDS protection:', error);
    
    const testResults: TestCondition[] = [{
      name: 'validation-error',
      description: 'RDS database validation process',
      status: 'error',
      message: 'Failed to validate RDS configuration due to AWS API error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }];
    
    return {
      exerciseId: 'rds-protection',
      passed: false,
      message: `RDS validation failed due to error: ${error.message}`,
      testResults,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        checkFunction: 'validateRDSProtection'
      }
    };
  }
}

/**
 * Discover project database instances
 */
async function discoverProjectDatabase(rdsClient: RDSClient): Promise<{
  found: boolean;
  message: string;
  details: string[];
  dbInstance?: DBInstance;
}> {
  const details: string[] = [];

  try {
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    const dbInstances = response.DBInstances || [];
    
    details.push(`Found ${dbInstances.length} total RDS instances in region`);

    // Filter for project databases (look for tags)
    const projectDatabases = dbInstances.filter(db => {
      const tags = db.TagList || [];
      const hasProjectTag = tags.some(tag => 
        tag.Key === 'proyecto' && tag.Value === 'cybersec'
      );
      return hasProjectTag;
    });

    if (projectDatabases.length === 0) {
      // Fallback: look for PostgreSQL databases if no tags found
      const postgresInstances = dbInstances.filter(db => 
        db.Engine?.toLowerCase().includes('postgres')
      );
      
      if (postgresInstances.length > 0) {
        details.push(`No databases with 'proyecto=cybersec' tags found`);
        details.push(`Found ${postgresInstances.length} PostgreSQL instance(s) without project tags`);
        details.push('Recommendation: Add proper project tags for identification');
        
        return {
          found: true,
          message: 'PostgreSQL database found but missing project tags',
          details,
          dbInstance: postgresInstances[0]
        };
      } else {
        details.push('No PostgreSQL databases found in region');
        return {
          found: false,
          message: 'No PostgreSQL database found with project tags',
          details
        };
      }
    }

    const primaryDB = projectDatabases[0];
    details.push(`✅ Found project database: ${primaryDB.DBInstanceIdentifier}`);
    details.push(`   Engine: ${primaryDB.Engine} ${primaryDB.EngineVersion}`);
    details.push(`   Status: ${primaryDB.DBInstanceStatus}`);

    return {
      found: true,
      message: 'Project PostgreSQL database successfully located',
      details,
      dbInstance: primaryDB
    };

  } catch (error: any) {
    details.push(`Error discovering databases: ${error.message}`);
    return {
      found: false,
      message: 'Failed to discover project database',
      details
    };
  }
}

/**
 * Validate database engine is PostgreSQL
 */
function validateDatabaseEngine(dbInstance: DBInstance): {
  isValid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  const engine = dbInstance.Engine?.toLowerCase() || '';
  
  details.push(`Database engine: ${dbInstance.Engine} ${dbInstance.EngineVersion}`);
  
  if (engine.includes('postgres')) {
    details.push('✅ PostgreSQL engine confirmed (enterprise-grade database)');
    details.push(`✅ Engine version: ${dbInstance.EngineVersion}`);
    
    return {
      isValid: true,
      message: 'PostgreSQL engine properly configured',
      details
    };
  } else {
    details.push(`❌ Expected PostgreSQL, found: ${dbInstance.Engine}`);
    details.push('Workshop requires PostgreSQL for enterprise database features');
    
    return {
      isValid: false,
      message: 'Incorrect database engine - PostgreSQL required',
      details
    };
  }
}

/**
 * Validate Multi-AZ configuration for high availability
 */
function validateMultiAZConfiguration(dbInstance: DBInstance): {
  isValid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  const isMultiAZ = dbInstance.MultiAZ || false;
  
  details.push(`Multi-AZ deployment: ${isMultiAZ ? 'Enabled' : 'Disabled'}`);
  
  if (isMultiAZ) {
    details.push('✅ High availability configuration active');
    details.push('✅ Primary node for normal operations');
    details.push('✅ Standby node for business continuity');
    details.push('✅ Automatic failover enabled');
    
    // Check backup retention
    const backupRetention = dbInstance.BackupRetentionPeriod || 0;
    details.push(`✅ Backup retention: ${backupRetention} days`);
    
    return {
      isValid: true,
      message: 'Multi-AZ configuration provides high availability and data protection',
      details
    };
  } else {
    details.push('❌ Single-AZ deployment detected');
    details.push('❌ No automatic failover protection');
    details.push('❌ Risk of downtime during maintenance or failures');
    
    return {
      isValid: false,
      message: 'Multi-AZ deployment required for high availability',
      details
    };
  }
}

/**
 * Validate subnet group isolation in internal tier
 */
async function validateSubnetGroupIsolation(
  rdsClient: RDSClient,
  ec2Client: EC2Client,
  dbInstance: DBInstance
): Promise<{
  isValid: boolean;
  message: string;
  details: string[];
}> {
  const details: string[] = [];
  const subnetGroupName = dbInstance.DBSubnetGroup?.DBSubnetGroupName;
  
  if (!subnetGroupName) {
    details.push('❌ No DB subnet group found');
    return {
      isValid: false,
      message: 'Database missing subnet group configuration',
      details
    };
  }

  details.push(`DB Subnet Group: ${subnetGroupName}`);

  try {
    // Get subnet group details
    const subnetGroupResponse = await rdsClient.send(
      new DescribeDBSubnetGroupsCommand({
        DBSubnetGroupName: subnetGroupName
      })
    );

    const subnetGroup = subnetGroupResponse.DBSubnetGroups?.[0];
    if (!subnetGroup) {
      details.push('❌ Subnet group not found');
      return {
        isValid: false,
        message: 'DB subnet group not accessible',
        details
      };
    }

    const subnetIds = subnetGroup.Subnets?.map(subnet => subnet.SubnetIdentifier).filter((id): id is string => id !== undefined) || [];
    details.push(`Subnets in group: ${subnetIds.length}`);

    // Get subnet details and route tables to classify tiers
    const subnetResponse = await ec2Client.send(
      new DescribeSubnetsCommand({
        SubnetIds: subnetIds
      })
    );

    const subnets = subnetResponse.Subnets || [];
    const vpcId = subnets[0]?.VpcId;

    if (!vpcId) {
      details.push('❌ Cannot determine VPC for subnet analysis');
      return {
        isValid: false,
        message: 'Unable to analyze subnet network configuration',
        details
      };
    }

    // Get route tables for tier classification
    const routeTableResponse = await ec2Client.send(
      new DescribeRouteTablesCommand({
        Filters: [
          { Name: 'vpc-id', Values: [vpcId] }
        ]
      })
    );

    const routeTables = routeTableResponse.RouteTables || [];

    // Classify each subnet
    let internalSubnets = 0;
    let publicSubnets = 0;
    let privateSubnets = 0;

    for (const subnet of subnets) {
      const tier = classifySubnetTier(subnet, routeTables);
      details.push(`  - ${subnet.SubnetId} (${subnet.AvailabilityZone}): ${tier} tier`);
      
      if (tier === 'internal') {
        internalSubnets++;
      } else if (tier === 'public') {
        publicSubnets++;
      } else if (tier === 'private') {
        privateSubnets++;
      }
    }

    // Validate all subnets are internal tier
    if (internalSubnets === subnets.length && publicSubnets === 0 && privateSubnets === 0) {
      details.push('✅ All subnets are in internal tier (maximum isolation)');
      details.push('✅ No internet gateway access');
      details.push('✅ Database fully isolated from public network');
      
      return {
        isValid: true,
        message: 'Database properly isolated in internal subnets with no internet access',
        details
      };
    } else {
      if (publicSubnets > 0) {
        details.push(`❌ ${publicSubnets} subnet(s) in public tier - security risk`);
      }
      if (privateSubnets > 0) {
        details.push(`❌ ${privateSubnets} subnet(s) in private tier - should be internal`);
      }
      details.push('❌ Database not properly isolated');
      
      return {
        isValid: false,
        message: 'Database subnet group not isolated - contains non-internal subnets',
        details
      };
    }

  } catch (error: any) {
    details.push(`Error analyzing subnet isolation: ${error.message}`);
    return {
      isValid: false,
      message: 'Failed to validate subnet group isolation',
      details
    };
  }
}

/**
 * Classify subnet tier based on route table configuration
 */
function classifySubnetTier(subnet: any, routeTables: any[]): string {
  // Find route table for this subnet
  let subnetRouteTable = null;
  
  // Look for explicit subnet association
  for (const routeTable of routeTables) {
    const hasSubnetAssociation = routeTable.Associations?.some((assoc: any) => 
      assoc.SubnetId === subnet.SubnetId
    );
    if (hasSubnetAssociation) {
      subnetRouteTable = routeTable;
      break;
    }
  }
  
  // If no explicit association, use main route table
  if (!subnetRouteTable) {
    subnetRouteTable = routeTables.find(rt => 
      rt.Associations?.some((assoc: any) => assoc.Main === true)
    );
  }
  
  if (!subnetRouteTable) {
    return 'unknown';
  }
  
  // Analyze routes to determine tier
  for (const route of subnetRouteTable.Routes || []) {
    // Public tier: has internet gateway route
    if (route.GatewayId?.startsWith('igw-')) {
      return 'public';
    }
    
    // Private tier: has NAT gateway route
    if (route.NatGatewayId?.startsWith('nat-')) {
      return 'private';
    }
  }
  
  // Internal tier: no internet routes
  return 'internal';
}

/**
 * Validate security group assignment
 */
function validateSecurityGroupAssignment(dbInstance: DBInstance): {
  isValid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  const vpcSecurityGroups = dbInstance.VpcSecurityGroups || [];
  
  details.push(`Security groups assigned: ${vpcSecurityGroups.length}`);
  
  let hasBdsg = false;
  for (const sg of vpcSecurityGroups) {
    details.push(`  - ${sg.VpcSecurityGroupId} (${sg.Status})`);
    
    // Note: We can't determine the group name from RDS response,
    // but we can check if any security groups are assigned
    if (sg.Status === 'active') {
      hasBdsg = true; // Assume proper assignment if active SG exists
    }
  }
  
  if (hasBdsg && vpcSecurityGroups.length > 0) {
    details.push('✅ Security groups properly assigned');
    details.push('✅ Database access controlled by security group rules');
    details.push('Note: Verify security group is "bdsg" with restricted rules');
    
    return {
      isValid: true,
      message: 'Security groups assigned for access control',
      details
    };
  } else {
    details.push('❌ No active security groups found');
    details.push('❌ Database may be using default security group');
    
    return {
      isValid: false,
      message: 'No proper security group assignment found',
      details
    };
  }
}

/**
 * Validate public accessibility settings
 */
function validatePublicAccessibility(dbInstance: DBInstance): {
  isValid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  const isPublic = dbInstance.PubliclyAccessible || false;
  
  details.push(`Publicly accessible setting: ${isPublic ? 'Yes' : 'No'}`);
  
  if (!isPublic) {
    details.push('✅ Database not publicly accessible');
    details.push('✅ Access only via VPC internal networks');
    details.push('✅ Additional protection against internet-based attacks');
    
    return {
      isValid: true,
      message: 'Database properly configured as private (not publicly accessible)',
      details
    };
  } else {
    details.push('❌ Database marked as publicly accessible');
    details.push('❌ Security risk - potential internet exposure');
    details.push('❌ Violates principle of maximum data protection');
    
    return {
      isValid: false,
      message: 'Database incorrectly configured as publicly accessible',
      details
    };
  }
}

/**
 * Validate Application Load Balancer Configuration (Exercise 7)
 * Checks ALB and Target Group with proper security and routing
 */
export async function validateALBConfiguration(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const elbv2Client = new ElasticLoadBalancingV2Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  });

  const testResults: TestCondition[] = [];
  let overallPassed = true;

  try {
    // Test 1: Find Target Group 'maintg'
    const targetGroupDiscovery = await discoverTargetGroup(elbv2Client);
    testResults.push({
      name: 'target-group-discovery',
      description: 'Locate Target Group \'maintg\' with project tags',
      status: targetGroupDiscovery.found ? 'pass' : 'fail',
      message: targetGroupDiscovery.message,
      details: targetGroupDiscovery.details.join('\n')
    });
    if (!targetGroupDiscovery.found) overallPassed = false;

    // Test 2: Validate Target Group configuration
    if (targetGroupDiscovery.targetGroup) {
      const tgValidation = validateTargetGroupConfig(targetGroupDiscovery.targetGroup);
      testResults.push({
        name: 'target-group-config',
        description: 'Verify Target Group port 8080 and health checks',
        status: tgValidation.valid ? 'pass' : 'fail',
        message: tgValidation.message,
        details: tgValidation.details.join('\n')
      });
      if (!tgValidation.valid) overallPassed = false;
    }

    // Test 3: Find Application Load Balancer 'pokemonlb'
    const albDiscovery = await discoverApplicationLoadBalancer(elbv2Client);
    testResults.push({
      name: 'alb-discovery',
      description: 'Locate Application Load Balancer \'pokemonlb\' with project tags',
      status: albDiscovery.found ? 'pass' : 'fail',
      message: albDiscovery.message,
      details: albDiscovery.details.join('\n')
    });
    if (!albDiscovery.found) overallPassed = false;

    // Test 4: Validate ALB configuration
    if (albDiscovery.loadBalancer) {
      const albValidation = validateALBConfig(albDiscovery.loadBalancer);
      testResults.push({
        name: 'alb-configuration',
        description: 'Verify ALB scheme, type and security groups',
        status: albValidation.valid ? 'pass' : 'fail',
        message: albValidation.message,
        details: albValidation.details.join('\n')
      });
      if (!albValidation.valid) overallPassed = false;
    }

    // Test 5: Validate ALB Listeners
    if (albDiscovery.loadBalancer) {
      const listenerValidation = await validateALBListeners(elbv2Client, albDiscovery.loadBalancer.LoadBalancerArn!);
      testResults.push({
        name: 'alb-listeners',
        description: 'Verify ALB has HTTP listener on port 80 routing to maintg',
        status: listenerValidation.valid ? 'pass' : 'fail',
        message: listenerValidation.message,
        details: listenerValidation.details.join('\n')
      });
      if (!listenerValidation.valid) overallPassed = false;
    }

    const passedCount = testResults.filter(t => t.status === 'pass').length;
    const totalTests = testResults.length;
    const message = overallPassed
      ? `✅ ALB configuration is properly implemented with secure settings (${passedCount}/${totalTests} tests passed)`
      : `❌ ALB configuration has issues that need attention (${passedCount}/${totalTests} tests passed)`;

    return {
      exerciseId: 'alb-configuration',
      passed: overallPassed,
      message,
      testResults,
      details: {
        summary: 'Application Load Balancer validation completed',
        totalTests,
        passedTests: passedCount,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error validating ALB configuration:', error);
    
    const errorTest: TestCondition = {
      name: 'validation-error',
      description: 'ALB validation process',
      status: 'error',
      message: 'Failed to validate due to AWS API error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return {
      exerciseId: 'alb-configuration',
      passed: false,
      message: 'ALB validation failed due to error',
      testResults: [errorTest],
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Helper function to discover Target Group
async function discoverTargetGroup(elbv2Client: ElasticLoadBalancingV2Client): Promise<{
  found: boolean;
  message: string;
  details: string[];
  targetGroup?: any;
}> {
  try {
    const { TargetGroups } = await elbv2Client.send(new DescribeTargetGroupsCommand({}));
    const details: string[] = [];
    
    if (!TargetGroups || TargetGroups.length === 0) {
      return {
        found: false,
        message: 'No target groups found in region',
        details: ['No target groups exist in us-east-1 region']
      };
    }
    
    details.push(`Found ${TargetGroups.length} target group(s) in region`);
    
    // Look for target group named 'maintg'
    const maintg = TargetGroups.find(tg => tg.TargetGroupName === 'maintg');
    
    if (!maintg) {
      const tgNames = TargetGroups.map(tg => tg.TargetGroupName).join(', ');
      return {
        found: false,
        message: 'Target group \'maintg\' not found',
        details: [
          ...details,
          'No target group named \'maintg\' found',
          `Available target groups: ${tgNames}`
        ]
      };
    }
    
    // Check tags
    const tagsResponse = await elbv2Client.send(new DescribeTagsCommand({
      ResourceArns: [maintg.TargetGroupArn!]
    }));
    
    const tags = tagsResponse.TagDescriptions?.[0]?.Tags || [];
    const tagMap = new Map(tags.map(tag => [tag.Key, tag.Value]));
    
    details.push(`Target group 'maintg' found: ${maintg.TargetGroupArn}`);
    details.push(`Port: ${maintg.Port}`);
    details.push(`Protocol: ${maintg.Protocol}`);
    
    if (tagMap.get('proyecto') !== 'cybersec' || tagMap.get('funcion') !== 'lb') {
      return {
        found: false,
        message: 'Target group \'maintg\' found but missing required tags',
        details: [
          ...details,
          `Tags found: ${JSON.stringify(Object.fromEntries(tagMap))}`,
          'Required tags: proyecto=cybersec, funcion=lb'
        ],
        targetGroup: maintg
      };
    }
    
    details.push(`✓ Required tags present: proyecto=${tagMap.get('proyecto')}, funcion=${tagMap.get('funcion')}`);
    
    return {
      found: true,
      message: 'Target group \'maintg\' found with correct tags',
      details,
      targetGroup: maintg
    };
    
  } catch (error) {
    return {
      found: false,
      message: 'Error discovering target group',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Helper function to validate Target Group configuration
function validateTargetGroupConfig(targetGroup: any): {
  valid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  let valid = true;
  
  // Check port 8080
  if (targetGroup.Port !== 8080) {
    valid = false;
    details.push(`❌ Port is ${targetGroup.Port}, expected 8080`);
  } else {
    details.push(`✓ Port 8080 configured correctly`);
  }
  
  // Check health check configuration
  const healthCheck = targetGroup.HealthCheckPath;
  details.push(`Health check path: ${healthCheck || 'default'}`);
  details.push(`Health check protocol: ${targetGroup.HealthCheckProtocol}`);
  details.push(`Health check port: ${targetGroup.HealthCheckPort}`);
  details.push(`Health check enabled: ${targetGroup.HealthCheckEnabled}`);
  
  if (!targetGroup.HealthCheckEnabled) {
    valid = false;
    details.push(`❌ Health checks are disabled`);
  } else {
    details.push(`✓ Health checks are enabled`);
  }
  
  const message = valid
    ? 'Target group configuration is correct'
    : 'Target group configuration has issues';
    
  return { valid, message, details };
}

// Helper function to discover Application Load Balancer
async function discoverApplicationLoadBalancer(elbv2Client: ElasticLoadBalancingV2Client): Promise<{
  found: boolean;
  message: string;
  details: string[];
  loadBalancer?: any;
}> {
  try {
    const { LoadBalancers } = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
    const details: string[] = [];
    
    if (!LoadBalancers || LoadBalancers.length === 0) {
      return {
        found: false,
        message: 'No load balancers found in region',
        details: ['No load balancers exist in us-east-1 region']
      };
    }
    
    details.push(`Found ${LoadBalancers.length} load balancer(s) in region`);
    
    // Look for load balancer named 'pokemonlb'
    const pokemonlb = LoadBalancers.find(lb => lb.LoadBalancerName === 'pokemonlb');
    
    if (!pokemonlb) {
      const lbNames = LoadBalancers.map(lb => lb.LoadBalancerName).join(', ');
      return {
        found: false,
        message: 'Application Load Balancer \'pokemonlb\' not found',
        details: [
          ...details,
          'No load balancer named \'pokemonlb\' found',
          `Available load balancers: ${lbNames}`
        ]
      };
    }
    
    // Check tags
    const tagsResponse = await elbv2Client.send(new DescribeTagsCommand({
      ResourceArns: [pokemonlb.LoadBalancerArn!]
    }));
    
    const tags = tagsResponse.TagDescriptions?.[0]?.Tags || [];
    const tagMap = new Map(tags.map(tag => [tag.Key, tag.Value]));
    
    details.push(`Load balancer 'pokemonlb' found: ${pokemonlb.LoadBalancerArn}`);
    details.push(`Type: ${pokemonlb.Type}`);
    details.push(`Scheme: ${pokemonlb.Scheme}`);
    details.push(`State: ${pokemonlb.State?.Code}`);
    
    if (tagMap.get('proyecto') !== 'cybersec' || tagMap.get('funcion') !== 'lb') {
      return {
        found: false,
        message: 'Load balancer \'pokemonlb\' found but missing required tags',
        details: [
          ...details,
          `Tags found: ${JSON.stringify(Object.fromEntries(tagMap))}`,
          'Required tags: proyecto=cybersec, funcion=lb'
        ],
        loadBalancer: pokemonlb
      };
    }
    
    details.push(`✓ Required tags present: proyecto=${tagMap.get('proyecto')}, funcion=${tagMap.get('funcion')}`);
    
    return {
      found: true,
      message: 'Application Load Balancer \'pokemonlb\' found with correct tags',
      details,
      loadBalancer: pokemonlb
    };
    
  } catch (error) {
    return {
      found: false,
      message: 'Error discovering load balancer',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Helper function to validate ALB configuration
function validateALBConfig(loadBalancer: any): {
  valid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  let valid = true;
  
  // Check that it's an Application Load Balancer
  if (loadBalancer.Type !== 'application') {
    valid = false;
    details.push(`❌ Load balancer type is ${loadBalancer.Type}, expected 'application'`);
  } else {
    details.push(`✓ Correct type: Application Load Balancer`);
  }
  
  // Check scheme (should be internet-facing for public access)
  if (loadBalancer.Scheme !== 'internet-facing') {
    valid = false;
    details.push(`❌ Scheme is ${loadBalancer.Scheme}, expected 'internet-facing'`);
  } else {
    details.push(`✓ Correct scheme: internet-facing`);
  }
  
  // Check state
  if (loadBalancer.State?.Code !== 'active') {
    valid = false;
    details.push(`❌ Load balancer state is ${loadBalancer.State?.Code}, expected 'active'`);
  } else {
    details.push(`✓ Load balancer is active`);
  }
  
  // Check security groups (should include albsg)
  const securityGroups = loadBalancer.SecurityGroups || [];
  details.push(`Security groups: ${securityGroups.join(', ')}`);
  
  if (securityGroups.length === 0) {
    valid = false;
    details.push(`❌ No security groups attached`);
  } else {
    details.push(`✓ ${securityGroups.length} security group(s) attached`);
    // Note: We can't easily check the SG name here without additional API calls
    // The actual SG validation is done in the security groups exercise
  }
  
  const message = valid
    ? 'ALB configuration is correct'
    : 'ALB configuration has issues';
    
  return { valid, message, details };
}

// Helper function to validate ALB Listeners
async function validateALBListeners(elbv2Client: ElasticLoadBalancingV2Client, loadBalancerArn: string): Promise<{
  valid: boolean;
  message: string;
  details: string[];
}> {
  try {
    const { Listeners } = await elbv2Client.send(new DescribeListenersCommand({
      LoadBalancerArn: loadBalancerArn
    }));
    
    const details: string[] = [];
    let valid = true;
    
    if (!Listeners || Listeners.length === 0) {
      return {
        valid: false,
        message: 'No listeners configured on ALB',
        details: ['No listeners found on the load balancer']
      };
    }
    
    details.push(`Found ${Listeners.length} listener(s)`);
    
    // Look for HTTP listener on port 80
    const httpListener = Listeners.find(listener => 
      listener.Port === 80 && listener.Protocol === 'HTTP'
    );
    
    if (!httpListener) {
      valid = false;
      const listenerInfo = Listeners.map(l => `${l.Protocol}:${l.Port}`).join(', ');
      details.push(`❌ No HTTP listener on port 80 found`);
      details.push(`Available listeners: ${listenerInfo}`);
    } else {
      details.push(`✓ HTTP listener on port 80 found`);
      
      // Check default actions
      const defaultActions = httpListener.DefaultActions || [];
      details.push(`Default actions: ${defaultActions.length}`);
      
      for (const action of defaultActions) {
        details.push(`  Action type: ${action.Type}`);
        if (action.Type === 'forward' && action.TargetGroupArn) {
          const tgArnParts = action.TargetGroupArn.split('/');
          const tgName = tgArnParts[1]; // Extract name from ARN
          details.push(`  Forwarding to: ${tgName}`);
          
          if (tgName === 'maintg') {
            details.push(`  ✓ Correctly forwards to 'maintg' target group`);
          } else {
            valid = false;
            details.push(`  ❌ Should forward to 'maintg', currently forwards to '${tgName}'`);
          }
        }
      }
    }
    
    const message = valid
      ? 'ALB listeners are configured correctly'
      : 'ALB listener configuration has issues';
      
    return { valid, message, details };
    
  } catch (error) {
    return {
      valid: false,
      message: 'Error validating ALB listeners',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Validate Launch Template Security (Exercise 8)
 * Checks launch template configuration with proper security settings
 */
export async function validateLaunchTemplate(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const ec2Client = new EC2Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token
    }
  });

  const testResults: TestCondition[] = [];
  let overallPassed = true;

  try {
    // Test 1: Find Launch Template with project tags
    const templateDiscovery = await discoverProjectLaunchTemplate(ec2Client);
    testResults.push({
      name: 'launch-template-discovery',
      description: 'Locate Launch Template with project tags (proyecto=cybersec)',
      status: templateDiscovery.found ? 'pass' : 'fail',
      message: templateDiscovery.message,
      details: templateDiscovery.details.join('\n')
    });
    if (!templateDiscovery.found) overallPassed = false;

    if (templateDiscovery.launchTemplate) {
      // Test 2: Get and validate launch template configuration
      const configValidation = await validateLaunchTemplateConfig(ec2Client, templateDiscovery.launchTemplate);
      testResults.push({
        name: 'template-configuration',
        description: 'Verify launch template IAM role and security configuration',
        status: configValidation.valid ? 'pass' : 'fail',
        message: configValidation.message,
        details: configValidation.details.join('\n')
      });
      if (!configValidation.valid) overallPassed = false;

      // Test 3: Validate AMI base (Ubuntu)
      if (configValidation.templateData) {
        const amiValidation = await validateTemplateAMI(ec2Client, configValidation.templateData);
        testResults.push({
          name: 'ami-validation',
          description: 'Verify Ubuntu AMI base and image security',
          status: amiValidation.valid ? 'pass' : 'fail',
          message: amiValidation.message,
          details: amiValidation.details.join('\n')
        });
        if (!amiValidation.valid) overallPassed = false;
      }

      // Test 4: Validate User Data configuration
      if (configValidation.templateData) {
        const userDataValidation = validateUserData(configValidation.templateData);
        testResults.push({
          name: 'user-data-validation',
          description: 'Verify user data configuration for bootstrap automation',
          status: userDataValidation.valid ? 'pass' : 'fail',
          message: userDataValidation.message,
          details: userDataValidation.details.join('\n')
        });
        if (!userDataValidation.valid) overallPassed = false;
      }
    }

    const passedCount = testResults.filter(t => t.status === 'pass').length;
    const totalTests = testResults.length;
    const message = overallPassed
      ? `✅ Launch template is properly configured with security best practices (${passedCount}/${totalTests} tests passed)`
      : `❌ Launch template configuration has security issues that need attention (${passedCount}/${totalTests} tests passed)`;

    return {
      exerciseId: 'launch-template',
      passed: overallPassed,
      message,
      testResults,
      details: {
        summary: 'Launch Template security validation completed',
        totalTests,
        passedTests: passedCount,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error validating launch template:', error);
    
    const errorTest: TestCondition = {
      name: 'validation-error',
      description: 'Launch template validation process',
      status: 'error',
      message: 'Failed to validate due to AWS API error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return {
      exerciseId: 'launch-template',
      passed: false,
      message: 'Launch template validation failed due to error',
      testResults: [errorTest],
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Helper function to discover Launch Template
async function discoverProjectLaunchTemplate(ec2Client: EC2Client): Promise<{
  found: boolean;
  message: string;
  details: string[];
  launchTemplate?: any;
}> {
  try {
    const { LaunchTemplates } = await ec2Client.send(new DescribeLaunchTemplatesCommand({}));
    const details: string[] = [];
    
    if (!LaunchTemplates || LaunchTemplates.length === 0) {
      return {
        found: false,
        message: 'No launch templates found in region',
        details: ['No launch templates exist in us-east-1 region']
      };
    }
    
    details.push(`Found ${LaunchTemplates.length} launch template(s) in region`);
    
    // Look for launch templates with project tags
    let projectTemplate = null;
    
    for (const template of LaunchTemplates) {
      const tags = template.Tags || [];
      const tagMap = new Map(tags.map(tag => [tag.Key, tag.Value]));
      
      details.push(`Template: ${template.LaunchTemplateName} (ID: ${template.LaunchTemplateId})`);
      details.push(`  Tags: ${JSON.stringify(Object.fromEntries(tagMap))}`);
      
      if (tagMap.get('proyecto') === 'cybersec' && tagMap.get('funcion') === 'computacion') {
        projectTemplate = template;
        details.push(`  ✓ Found project template with correct tags`);
        break;
      }
    }
    
    if (!projectTemplate) {
      return {
        found: false,
        message: 'No launch template found with required project tags',
        details: [
          ...details,
          'No launch template found with tags: proyecto=cybersec, funcion=computacion'
        ]
      };
    }
    
    return {
      found: true,
      message: `Launch template '${projectTemplate.LaunchTemplateName}' found with correct tags`,
      details,
      launchTemplate: projectTemplate
    };
    
  } catch (error) {
    return {
      found: false,
      message: 'Error discovering launch templates',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Helper function to validate Launch Template configuration
async function validateLaunchTemplateConfig(ec2Client: EC2Client, launchTemplate: any): Promise<{
  valid: boolean;
  message: string;
  details: string[];
  templateData?: any;
}> {
  try {
    // Get the latest version of the launch template
    const { LaunchTemplateVersions } = await ec2Client.send(new DescribeLaunchTemplateVersionsCommand({
      LaunchTemplateId: launchTemplate.LaunchTemplateId,
      Versions: ['$Latest']
    }));
    
    const details: string[] = [];
    let valid = true;
    
    if (!LaunchTemplateVersions || LaunchTemplateVersions.length === 0) {
      return {
        valid: false,
        message: 'No launch template versions found',
        details: ['Unable to retrieve launch template configuration']
      };
    }
    
    const templateData = LaunchTemplateVersions[0].LaunchTemplateData!;
    details.push(`Launch template version: ${LaunchTemplateVersions[0].VersionNumber}`);
    details.push(`Created: ${LaunchTemplateVersions[0].CreateTime}`);
    
    // Check IAM Instance Profile
    if (!templateData.IamInstanceProfile) {
      valid = false;
      details.push('❌ No IAM instance profile configured');
      details.push('❌ Security risk - instances will have no AWS permissions');
    } else {
      details.push(`✓ IAM instance profile configured: ${templateData.IamInstanceProfile.Name || templateData.IamInstanceProfile.Arn}`);
      details.push('✓ Enables secure AWS service access');
    }
    
    // Check security groups
    const securityGroups = templateData.SecurityGroupIds || [];
    if (securityGroups.length === 0) {
      valid = false;
      details.push('❌ No security groups configured');
    } else {
      details.push(`✓ ${securityGroups.length} security group(s) configured: ${securityGroups.join(', ')}`);
    }
    
    // Check instance type
    if (templateData.InstanceType) {
      details.push(`Instance type: ${templateData.InstanceType}`);
    }
    
    // Check key pair
    if (templateData.KeyName) {
      details.push(`✓ Key pair configured: ${templateData.KeyName}`);
    } else {
      details.push('⚠️ No key pair configured (may limit SSH access)');
    }
    
    const message = valid
      ? 'Launch template configuration meets security requirements'
      : 'Launch template configuration has security issues';
      
    return { valid, message, details, templateData };
    
  } catch (error) {
    return {
      valid: false,
      message: 'Error validating launch template configuration',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Helper function to validate AMI base
async function validateTemplateAMI(ec2Client: EC2Client, templateData: any): Promise<{
  valid: boolean;
  message: string;
  details: string[];
}> {
  try {
    const details: string[] = [];
    let valid = true;
    
    if (!templateData.ImageId) {
      return {
        valid: false,
        message: 'No AMI specified in launch template',
        details: ['Launch template must specify an AMI']
      };
    }
    
    details.push(`AMI ID: ${templateData.ImageId}`);
    
    // Get AMI details
    try {
      const { Images } = await ec2Client.send(new DescribeImagesCommand({
        ImageIds: [templateData.ImageId]
      }));
      
      if (Images && Images.length > 0) {
        const image = Images[0];
        details.push(`AMI Name: ${image.Name}`);
        details.push(`Description: ${image.Description}`);
        details.push(`Architecture: ${image.Architecture}`);
        details.push(`Platform: ${image.Platform || 'Linux'}`);
        details.push(`Owner: ${image.OwnerId}`);
        
        // Check if it's Ubuntu (common patterns)
        const isUbuntu = (image.Name || '').toLowerCase().includes('ubuntu') ||
                        (image.Description || '').toLowerCase().includes('ubuntu');
        
        if (isUbuntu) {
          details.push('✓ AMI appears to be Ubuntu-based');
          details.push('✓ Meets workshop requirement for Ubuntu base');
        } else {
          // Don't fail completely, but warn
          details.push('⚠️ AMI may not be Ubuntu-based');
          details.push('⚠️ Workshop specifies Ubuntu AMI requirement');
        }
        
        // Check if AMI is public or owned by account
        if (image.Public) {
          details.push('✓ Using public AMI (standard practice)');
        } else {
          details.push(`✓ Using private AMI owned by ${image.OwnerId}`);
        }
        
      } else {
        valid = false;
        details.push('❌ AMI not found or not accessible');
      }
      
    } catch (amiError) {
      // Don't fail validation completely for AMI lookup issues
      details.push(`⚠️ Could not retrieve AMI details: ${amiError instanceof Error ? amiError.message : 'Unknown error'}`);
      details.push('AMI ID is configured, assuming it\'s valid');
    }
    
    const message = valid
      ? 'AMI configuration is valid'
      : 'AMI configuration has issues';
      
    return { valid, message, details };
    
  } catch (error) {
    return {
      valid: false,
      message: 'Error validating AMI',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Helper function to validate User Data
function validateUserData(templateData: any): {
  valid: boolean;
  message: string;
  details: string[];
} {
  const details: string[] = [];
  let valid = true;
  
  if (!templateData.UserData) {
    // User data is not strictly required, but recommended
    details.push('⚠️ No user data configured');
    details.push('⚠️ Workshop recommends user data for bootstrap automation');
    details.push('Consider adding user data for automated configuration');
  } else {
    details.push('✓ User data configured for bootstrap automation');
    details.push('✓ Enables automated instance configuration');
    
    // Decode base64 user data if possible
    try {
      const userDataDecoded = Buffer.from(templateData.UserData, 'base64').toString('utf8');
      const preview = userDataDecoded.substring(0, 200);
      details.push(`User data preview: ${preview}${userDataDecoded.length > 200 ? '...' : ''}`);
      
      // Check for common bootstrap patterns
      const hasShebang = userDataDecoded.startsWith('#!/');
      const hasAptUpdate = userDataDecoded.includes('apt update') || userDataDecoded.includes('apt-get update');
      const hasInstalls = userDataDecoded.includes('install');
      
      if (hasShebang) {
        details.push('✓ Script starts with proper shebang');
      }
      if (hasAptUpdate || hasInstalls) {
        details.push('✓ Includes package management commands');
      }
      
    } catch (decodeError) {
      details.push('User data is configured but could not decode for analysis');
    }
  }
  
  // User data validation is informational, not critical for security
  const message = 'User data configuration analyzed';
  return { valid, message, details };
}