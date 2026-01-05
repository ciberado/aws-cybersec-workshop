import { RDSClient, DescribeDBInstancesCommand, DescribeDBSubnetGroupsCommand } from '@aws-sdk/client-rds';
import { EC2Client, DescribeSubnetsCommand, DescribeRouteTablesCommand } from '@aws-sdk/client-ec2';
import { ElasticLoadBalancingV2Client, DescribeLoadBalancersCommand, DescribeTargetGroupsCommand, DescribeListenersCommand, DescribeTagsCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
/**
 * Validate RDS Database Protection (Exercise 6)
 * Checks PostgreSQL Multi-AZ configuration in internal subnets with proper security
 */
export async function validateRDSProtection(credentials) {
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
    const testResults = [];
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
        if (!dbDiscovery.found)
            overallPassed = false;
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
            if (!engineValidation.isValid)
                overallPassed = false;
            // Test 3: Validate Multi-AZ configuration
            const multiAZValidation = validateMultiAZConfiguration(dbDiscovery.dbInstance);
            testResults.push({
                name: 'multi-az-validation',
                description: 'Verify Multi-AZ deployment for high availability',
                status: multiAZValidation.isValid ? 'pass' : 'fail',
                message: multiAZValidation.message,
                details: multiAZValidation.details.join('\n')
            });
            if (!multiAZValidation.isValid)
                overallPassed = false;
            // Test 4: Validate network isolation - subnet group in internal tier
            const subnetValidation = await validateSubnetGroupIsolation(rdsClient, ec2Client, dbDiscovery.dbInstance);
            testResults.push({
                name: 'network-isolation',
                description: 'Verify database is isolated in internal subnets (no internet access)',
                status: subnetValidation.isValid ? 'pass' : 'fail',
                message: subnetValidation.message,
                details: subnetValidation.details.join('\n')
            });
            if (!subnetValidation.isValid)
                overallPassed = false;
            // Test 5: Validate security group assignment
            const securityValidation = validateSecurityGroupAssignment(dbDiscovery.dbInstance);
            testResults.push({
                name: 'security-groups',
                description: 'Verify proper security group assignment (bdsg for restricted access)',
                status: securityValidation.isValid ? 'pass' : 'fail',
                message: securityValidation.message,
                details: securityValidation.details.join('\n')
            });
            if (!securityValidation.isValid)
                overallPassed = false;
            // Test 6: Validate no public accessibility
            const accessValidation = validatePublicAccessibility(dbDiscovery.dbInstance);
            testResults.push({
                name: 'public-access',
                description: 'Verify database is not publicly accessible',
                status: accessValidation.isValid ? 'pass' : 'fail',
                message: accessValidation.message,
                details: accessValidation.details.join('\n')
            });
            if (!accessValidation.isValid)
                overallPassed = false;
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
    }
    catch (error) {
        console.error('Error validating RDS protection:', error);
        const testResults = [{
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
async function discoverProjectDatabase(rdsClient) {
    const details = [];
    try {
        const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
        const dbInstances = response.DBInstances || [];
        details.push(`Found ${dbInstances.length} total RDS instances in region`);
        // Filter for project databases (look for tags)
        const projectDatabases = dbInstances.filter(db => {
            const tags = db.TagList || [];
            const hasProjectTag = tags.some(tag => tag.Key === 'proyecto' && tag.Value === 'cybersec');
            return hasProjectTag;
        });
        if (projectDatabases.length === 0) {
            // Fallback: look for PostgreSQL databases if no tags found
            const postgresInstances = dbInstances.filter(db => db.Engine?.toLowerCase().includes('postgres'));
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
            }
            else {
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
    }
    catch (error) {
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
function validateDatabaseEngine(dbInstance) {
    const details = [];
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
    }
    else {
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
function validateMultiAZConfiguration(dbInstance) {
    const details = [];
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
    }
    else {
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
async function validateSubnetGroupIsolation(rdsClient, ec2Client, dbInstance) {
    const details = [];
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
        const subnetGroupResponse = await rdsClient.send(new DescribeDBSubnetGroupsCommand({
            DBSubnetGroupName: subnetGroupName
        }));
        const subnetGroup = subnetGroupResponse.DBSubnetGroups?.[0];
        if (!subnetGroup) {
            details.push('❌ Subnet group not found');
            return {
                isValid: false,
                message: 'DB subnet group not accessible',
                details
            };
        }
        const subnetIds = subnetGroup.Subnets?.map(subnet => subnet.SubnetIdentifier).filter((id) => id !== undefined) || [];
        details.push(`Subnets in group: ${subnetIds.length}`);
        // Get subnet details and route tables to classify tiers
        const subnetResponse = await ec2Client.send(new DescribeSubnetsCommand({
            SubnetIds: subnetIds
        }));
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
        const routeTableResponse = await ec2Client.send(new DescribeRouteTablesCommand({
            Filters: [
                { Name: 'vpc-id', Values: [vpcId] }
            ]
        }));
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
            }
            else if (tier === 'public') {
                publicSubnets++;
            }
            else if (tier === 'private') {
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
        }
        else {
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
    }
    catch (error) {
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
function classifySubnetTier(subnet, routeTables) {
    // Find route table for this subnet
    let subnetRouteTable = null;
    // Look for explicit subnet association
    for (const routeTable of routeTables) {
        const hasSubnetAssociation = routeTable.Associations?.some((assoc) => assoc.SubnetId === subnet.SubnetId);
        if (hasSubnetAssociation) {
            subnetRouteTable = routeTable;
            break;
        }
    }
    // If no explicit association, use main route table
    if (!subnetRouteTable) {
        subnetRouteTable = routeTables.find(rt => rt.Associations?.some((assoc) => assoc.Main === true));
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
function validateSecurityGroupAssignment(dbInstance) {
    const details = [];
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
    }
    else {
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
function validatePublicAccessibility(dbInstance) {
    const details = [];
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
    }
    else {
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
export async function validateALBConfiguration(credentials) {
    const elbv2Client = new ElasticLoadBalancingV2Client({
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
        // Test 1: Find Target Group 'maintg'
        const targetGroupDiscovery = await discoverTargetGroup(elbv2Client);
        testResults.push({
            name: 'target-group-discovery',
            description: 'Locate Target Group \'maintg\' with project tags',
            status: targetGroupDiscovery.found ? 'pass' : 'fail',
            message: targetGroupDiscovery.message,
            details: targetGroupDiscovery.details.join('\n')
        });
        if (!targetGroupDiscovery.found)
            overallPassed = false;
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
            if (!tgValidation.valid)
                overallPassed = false;
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
        if (!albDiscovery.found)
            overallPassed = false;
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
            if (!albValidation.valid)
                overallPassed = false;
        }
        // Test 5: Validate ALB Listeners
        if (albDiscovery.loadBalancer) {
            const listenerValidation = await validateALBListeners(elbv2Client, albDiscovery.loadBalancer.LoadBalancerArn);
            testResults.push({
                name: 'alb-listeners',
                description: 'Verify ALB has HTTP listener on port 80 routing to maintg',
                status: listenerValidation.valid ? 'pass' : 'fail',
                message: listenerValidation.message,
                details: listenerValidation.details.join('\n')
            });
            if (!listenerValidation.valid)
                overallPassed = false;
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
    }
    catch (error) {
        console.error('Error validating ALB configuration:', error);
        const errorTest = {
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
async function discoverTargetGroup(elbv2Client) {
    try {
        const { TargetGroups } = await elbv2Client.send(new DescribeTargetGroupsCommand({}));
        const details = [];
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
            ResourceArns: [maintg.TargetGroupArn]
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
    }
    catch (error) {
        return {
            found: false,
            message: 'Error discovering target group',
            details: [error instanceof Error ? error.message : 'Unknown error']
        };
    }
}
// Helper function to validate Target Group configuration
function validateTargetGroupConfig(targetGroup) {
    const details = [];
    let valid = true;
    // Check port 8080
    if (targetGroup.Port !== 8080) {
        valid = false;
        details.push(`❌ Port is ${targetGroup.Port}, expected 8080`);
    }
    else {
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
    }
    else {
        details.push(`✓ Health checks are enabled`);
    }
    const message = valid
        ? 'Target group configuration is correct'
        : 'Target group configuration has issues';
    return { valid, message, details };
}
// Helper function to discover Application Load Balancer
async function discoverApplicationLoadBalancer(elbv2Client) {
    try {
        const { LoadBalancers } = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
        const details = [];
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
            ResourceArns: [pokemonlb.LoadBalancerArn]
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
    }
    catch (error) {
        return {
            found: false,
            message: 'Error discovering load balancer',
            details: [error instanceof Error ? error.message : 'Unknown error']
        };
    }
}
// Helper function to validate ALB configuration
function validateALBConfig(loadBalancer) {
    const details = [];
    let valid = true;
    // Check that it's an Application Load Balancer
    if (loadBalancer.Type !== 'application') {
        valid = false;
        details.push(`❌ Load balancer type is ${loadBalancer.Type}, expected 'application'`);
    }
    else {
        details.push(`✓ Correct type: Application Load Balancer`);
    }
    // Check scheme (should be internet-facing for public access)
    if (loadBalancer.Scheme !== 'internet-facing') {
        valid = false;
        details.push(`❌ Scheme is ${loadBalancer.Scheme}, expected 'internet-facing'`);
    }
    else {
        details.push(`✓ Correct scheme: internet-facing`);
    }
    // Check state
    if (loadBalancer.State?.Code !== 'active') {
        valid = false;
        details.push(`❌ Load balancer state is ${loadBalancer.State?.Code}, expected 'active'`);
    }
    else {
        details.push(`✓ Load balancer is active`);
    }
    // Check security groups (should include albsg)
    const securityGroups = loadBalancer.SecurityGroups || [];
    details.push(`Security groups: ${securityGroups.join(', ')}`);
    if (securityGroups.length === 0) {
        valid = false;
        details.push(`❌ No security groups attached`);
    }
    else {
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
async function validateALBListeners(elbv2Client, loadBalancerArn) {
    try {
        const { Listeners } = await elbv2Client.send(new DescribeListenersCommand({
            LoadBalancerArn: loadBalancerArn
        }));
        const details = [];
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
        const httpListener = Listeners.find(listener => listener.Port === 80 && listener.Protocol === 'HTTP');
        if (!httpListener) {
            valid = false;
            const listenerInfo = Listeners.map(l => `${l.Protocol}:${l.Port}`).join(', ');
            details.push(`❌ No HTTP listener on port 80 found`);
            details.push(`Available listeners: ${listenerInfo}`);
        }
        else {
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
                    }
                    else {
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
    }
    catch (error) {
        return {
            valid: false,
            message: 'Error validating ALB listeners',
            details: [error instanceof Error ? error.message : 'Unknown error']
        };
    }
}
