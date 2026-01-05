import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeRouteTablesCommand, DescribeInternetGatewaysCommand, DescribeNatGatewaysCommand } from '@aws-sdk/client-ec2'
import type { AWSCredentials, ExerciseResult, TestCondition } from '../../shared/types.js'

/**
 * Validate VPC Network Design (Exercise 3)
 * Checks CIDR design and subnet segmentation for three-tier architecture
 */
export async function validateVPCArchitecture(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const ec2Client = new EC2Client({
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
    // Test 1: Find the project VPC
    const vpcId = await findProjectVPC(ec2Client)
    if (!vpcId) {
      testResults.push({
        name: 'vpc-discovery',
        description: 'Locate VPC with correct tags (proyecto=cybersec, funcion=red)',
        status: 'fail',
        message: 'No VPC found with required tags',
        details: 'Searched for VPC with tags proyecto=cybersec and funcion=red'
      })
      overallPassed = false
      
      return {
        exerciseId: 'vpc-architecture',
        passed: false,
        message: 'VPC not found with required tags (proyecto=cybersec, funcion=red)',
        testResults,
        details: {
          timestamp: new Date().toISOString(),
          checkFunction: 'validateVPCArchitecture'
        }
      }
    }

    testResults.push({
      name: 'vpc-discovery',
      description: 'Locate VPC with correct tags (proyecto=cybersec, funcion=red)',
      status: 'pass',
      message: `Found project VPC: ${vpcId}`,
      details: 'VPC discovered with correct tagging'
    })

    // Test 2: Validate VPC CIDR design
    const vpcInfo = await getVPCInfo(ec2Client, vpcId)
    const cidrValidation = validateCIDRDesign(vpcInfo)
    testResults.push({
      name: 'vpc-cidr',
      description: 'Validate VPC uses /16 CIDR for future growth',
      status: cidrValidation.isValid ? 'pass' : 'fail',
      message: cidrValidation.message,
      details: cidrValidation.details.join('\n')
    })
    if (!cidrValidation.isValid) overallPassed = false

    // Test 3: Validate basic subnet architecture
    const subnetValidation = await validateBasicSubnetArchitecture(ec2Client, vpcId)
    testResults.push({
      name: 'subnet-architecture',
      description: 'Validate subnet count, sizing, and distribution',
      status: subnetValidation.isValid ? 'pass' : 'fail',
      message: subnetValidation.message,
      details: subnetValidation.details.join('\n')
    })
    if (!subnetValidation.isValid) overallPassed = false

    // Test 4: Validate subnet capacity requirements
    const capacityValidation = validateBasicSubnetCapacity(subnetValidation.subnets)
    testResults.push({
      name: 'subnet-capacity',
      description: 'Verify subnet CIDR sizes meet capacity requirements',
      status: capacityValidation.isValid ? 'pass' : 'fail',
      message: capacityValidation.message,
      details: capacityValidation.details.join('\n')
    })
    if (!capacityValidation.isValid) overallPassed = false

    return {
      exerciseId: 'vpc-architecture',
      passed: overallPassed,
      message: overallPassed ? 
        'VPC architecture meets security and design requirements' :
        'VPC architecture issues found',
      testResults,
      details: {
        vpcId,
        cidrBlock: vpcInfo.cidrBlock,
        subnetCount: subnetValidation.subnets.length,
        timestamp: new Date().toISOString(),
        checkFunction: 'validateVPCArchitecture'
      }
    }

  } catch (error: any) {
    console.error('Error validating VPC architecture:', error)
    
    return {
      exerciseId: 'vpc-architecture',
      passed: false,
      message: `Error validating VPC architecture: ${error.message}`,
      testResults: [{
        name: 'validation-error',
        description: 'VPC architecture validation process',
        status: 'fail',
        message: error.message || 'Unknown error',
        details: error.stack || 'No stack trace available'
      }],
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
        checkFunction: 'validateVPCArchitecture'
      }
    }
  }
}

/**
 * Validate Network Route Tables (Exercise 4)
 * Checks traffic control and routing between security tiers
 */
export async function validateRouteTables(
  credentials: AWSCredentials
): Promise<ExerciseResult> {
  const ec2Client = new EC2Client({
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
    // Test 1: Find the project VPC
    const vpcId = await findProjectVPC(ec2Client)
    if (!vpcId) {
      testResults.push({
        name: 'vpc-discovery',
        description: 'Locate VPC for route table validation',
        status: 'fail',
        message: 'No VPC found with required tags',
        details: 'Cannot validate route tables without VPC'
      })
      overallPassed = false
      
      return {
        exerciseId: 'route-tables',
        passed: false,
        message: 'VPC not found for route table validation',
        testResults,
        details: {
          timestamp: new Date().toISOString(),
          checkFunction: 'validateRouteTables'
        }
      }
    }

    testResults.push({
      name: 'vpc-discovery',
      description: 'Locate VPC for route table validation',
      status: 'pass',
      message: `Found project VPC: ${vpcId}`,
      details: 'VPC discovered for route table analysis'
    })

    // Test 2: Validate Internet Gateway configuration
    const igwValidation = await validateInternetGateway(ec2Client, vpcId)
    testResults.push({
      name: 'internet-gateway',
      description: 'Validate Internet Gateway attachment and routing',
      status: igwValidation.isValid ? 'pass' : 'fail',
      message: igwValidation.message,
      details: igwValidation.details.join('\n')
    })
    if (!igwValidation.isValid) overallPassed = false

    // Test 3: Validate NAT Gateway configuration
    const natValidation = await validateNATGateway(ec2Client, vpcId)
    testResults.push({
      name: 'nat-gateway',
      description: 'Validate NAT Gateway for private subnet internet access',
      status: natValidation.isValid ? 'pass' : 'fail',
      message: natValidation.message,
      details: natValidation.details.join('\n')
    })
    if (!natValidation.isValid) overallPassed = false

    // Test 4: Validate route table assignments and three-tier implementation
    const routeValidation = await validateRouteTableConfiguration(ec2Client, vpcId)
    testResults.push({
      name: 'route-configuration',
      description: 'Validate route tables implement three-tier defense in depth',
      status: routeValidation.isValid ? 'pass' : 'fail',
      message: routeValidation.message,
      details: routeValidation.details.join('\n')
    })
    if (!routeValidation.isValid) overallPassed = false

    return {
      exerciseId: 'route-tables',
      passed: overallPassed,
      message: overallPassed ? 
        'Route tables properly configured for traffic control' :
        'Route table configuration issues found',
      testResults,
      details: {
        vpcId,
        internetGateway: igwValidation.gatewayId,
        natGateways: natValidation.natGateways,
        timestamp: new Date().toISOString(),
        checkFunction: 'validateRouteTables'
      }
    }

  } catch (error: any) {
    console.error('Error validating route tables:', error)
    
    return {
      exerciseId: 'route-tables',
      passed: false,
      message: `Error validating route tables: ${error.message}`,
      testResults: [{
        name: 'validation-error',
        description: 'Route table validation process',
        status: 'fail',
        message: error.message || 'Unknown error',
        details: error.stack || 'No stack trace available'
      }],
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
        checkFunction: 'validateRouteTables'
      }
    }
  }
}

/**
 * Find VPC using tags
 */
async function findProjectVPC(ec2Client: EC2Client): Promise<string | null> {
  try {
    const response = await ec2Client.send(new DescribeVpcsCommand({}))
    const vpcs = response.Vpcs || []

    for (const vpc of vpcs) {
      if (!vpc.VpcId) continue
      
      const tags = vpc.Tags || []
      const hasProyectoTag = tags.some(tag => tag.Key === 'proyecto' && tag.Value === 'cybersec')
      const hasFuncionTag = tags.some(tag => tag.Key === 'funcion' && tag.Value === 'red')
      
      if (hasProyectoTag && hasFuncionTag) {
        return vpc.VpcId
      }
    }

    return null
  } catch (error) {
    console.error('Error finding project VPC:', error)
    return null
  }
}

/**
 * Get VPC information
 */
async function getVPCInfo(ec2Client: EC2Client, vpcId: string): Promise<{
  vpcId: string
  cidrBlock: string
  state: string
}> {
  const response = await ec2Client.send(new DescribeVpcsCommand({
    VpcIds: [vpcId]
  }))
  
  const vpc = response.Vpcs?.[0]
  if (!vpc) {
    throw new Error(`VPC ${vpcId} not found`)
  }

  return {
    vpcId: vpc.VpcId!,
    cidrBlock: vpc.CidrBlock!,
    state: vpc.State!
  }
}

/**
 * Validate VPC CIDR design
 */
function validateCIDRDesign(vpcInfo: { cidrBlock: string }): {
  isValid: boolean
  message: string
  details: string[]
} {
  const details: string[] = []
  const cidr = vpcInfo.cidrBlock
  
  // Parse CIDR block
  const [, prefixLength] = cidr.split('/')
  const prefix = parseInt(prefixLength)
  
  details.push(`VPC CIDR: ${cidr}`)
  
  // Check if /16 for future growth
  if (prefix === 16) {
    details.push('✅ Uses /16 CIDR providing ~65,536 IP addresses')
    details.push('✅ Allows for future growth and proper subnet segmentation')
    return {
      isValid: true,
      message: 'VPC CIDR design meets requirements (/16)',
      details
    }
  } else {
    details.push(`❌ Uses /${prefix} instead of required /16`)
    details.push('❌ May not provide sufficient IP space for three-tier architecture')
    return {
      isValid: false,
      message: `VPC should use /16 CIDR, found /${prefix}`,
      details
    }
  }
}

/**
 * Validate basic subnet architecture (without route table analysis)
 */
async function validateBasicSubnetArchitecture(
  ec2Client: EC2Client, 
  vpcId: string
): Promise<{
  isValid: boolean
  message: string
  details: string[]
  subnets: any[]
}> {
  const details: string[] = []
  
  const response = await ec2Client.send(new DescribeSubnetsCommand({
    Filters: [
      { Name: 'vpc-id', Values: [vpcId] }
    ]
  }))
  
  const subnets = response.Subnets || []
  details.push(`Found ${subnets.length} subnets in VPC`)
  
  // Check subnet distribution across AZs
  const azDistribution: { [key: string]: number } = {}
  for (const subnet of subnets) {
    const az = subnet.AvailabilityZone!
    azDistribution[az] = (azDistribution[az] || 0) + 1
  }
  
  const azCount = Object.keys(azDistribution).length
  details.push(`Subnets distributed across ${azCount} Availability Zones`)
  
  for (const [az, count] of Object.entries(azDistribution)) {
    details.push(`  - ${az}: ${count} subnet(s)`)
  }
  
  // Validate minimum requirements for three-tier architecture
  let isValid = true
  const messages: string[] = []
  
  if (subnets.length < 3) {
    isValid = false
    messages.push('Insufficient subnets for three-tier architecture')
    details.push('❌ Need at least 3 subnets for public/private/internal tiers')
  } else {
    details.push('✅ Sufficient subnet count for three-tier architecture')
  }
  
  if (azCount < 2) {
    isValid = false
    messages.push('Subnets not distributed for high availability')
    details.push('❌ Subnets should be distributed across multiple AZs for HA')
  } else {
    details.push('✅ Subnets distributed across multiple AZs')
  }
  
  // Check for reasonable subnet sizes
  let hasLargeSubnets = false
  let hasSmallSubnets = false
  
  for (const subnet of subnets) {
    const cidr = subnet.CidrBlock!
    const [, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength)
    
    if (prefix <= 22) { // /22 or larger (1024+ IPs)
      hasLargeSubnets = true
    }
    if (prefix >= 24) { // /24 or smaller (256 IPs)
      hasSmallSubnets = true
    }
  }
  
  if (hasLargeSubnets && hasSmallSubnets) {
    details.push('✅ Mix of subnet sizes suitable for different tiers')
  } else if (hasLargeSubnets) {
    details.push('✅ Large subnets available for data tier')
  } else if (hasSmallSubnets) {
    details.push('✅ Appropriately sized subnets for web/app tiers')
  }
  
  const message = isValid ? 
    'Subnet architecture suitable for three-tier design' :
    `Subnet architecture issues: ${messages.join(', ')}`
  
  return {
    isValid,
    message,
    details,
    subnets
  }
}

/**
 * Validate basic subnet capacity (without tier classification)
 */
function validateBasicSubnetCapacity(subnets: any[]): {
  isValid: boolean
  message: string
  details: string[]
} {
  const details: string[] = []
  let isValid = true
  
  let smallSubnets = 0  // /24 or smaller (~256 IPs)
  let mediumSubnets = 0 // /23 (~512 IPs)
  let largeSubnets = 0  // /22 or larger (~1024+ IPs)
  
  for (const subnet of subnets) {
    const cidr = subnet.CidrBlock
    const [, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength)
    const availableIPs = Math.pow(2, 32 - prefix) - 5 // AWS reserves 5 IPs
    
    details.push(`${subnet.SubnetId}: ${cidr} → ~${availableIPs} usable IPs`)
    
    if (prefix >= 24) {
      smallSubnets++
    } else if (prefix === 23) {
      mediumSubnets++
    } else if (prefix <= 22) {
      largeSubnets++
    }
  }
  
  details.push(`Subnet capacity distribution:`)
  details.push(`  - Small (/24+): ${smallSubnets} subnets (~256 IPs each)`)
  details.push(`  - Medium (/23): ${mediumSubnets} subnets (~512 IPs each)`) 
  details.push(`  - Large (/22-): ${largeSubnets} subnets (~1024+ IPs each)`)
  
  // Validate we have appropriate capacity for different tiers
  if (smallSubnets >= 2 && largeSubnets >= 1) {
    details.push('✅ Good capacity mix for public/private (small) and internal (large) tiers')
  } else if (smallSubnets >= 2) {
    details.push('✅ Sufficient small subnets for public/private tiers')
    details.push('⚠️ Consider larger subnets for internal/data tier')
  } else if (largeSubnets >= 1) {
    details.push('✅ Large subnets available for internal tier')
    details.push('⚠️ Consider smaller subnets for public/private tiers')
  } else {
    isValid = false
    details.push('❌ Subnet capacity may not meet three-tier architecture requirements')
  }
  
  const message = isValid ?
    'Subnet capacity distribution suitable for three-tier architecture' :
    'Subnet capacity issues found'
  
  return { isValid, message, details }
}





/**
 * Validate Internet Gateway
 */
async function validateInternetGateway(ec2Client: EC2Client, vpcId: string): Promise<{
  isValid: boolean
  message: string
  details: string[]
  gatewayId?: string
}> {
  const details: string[] = []
  
  try {
    const response = await ec2Client.send(new DescribeInternetGatewaysCommand({
      Filters: [
        { Name: 'attachment.vpc-id', Values: [vpcId] }
      ]
    }))
    
    const igws = response.InternetGateways || []
    
    if (igws.length === 0) {
      details.push('❌ No Internet Gateway attached to VPC')
      return {
        isValid: false,
        message: 'No Internet Gateway found attached to VPC',
        details
      }
    }
    
    if (igws.length > 1) {
      details.push('⚠️ Multiple Internet Gateways found (unusual)')
    }
    
    const igw = igws[0]
    const attachment = igw.Attachments?.find(a => a.VpcId === vpcId)
    
    details.push(`✅ Internet Gateway found: ${igw.InternetGatewayId}`)
    if (attachment) {
      details.push(`✅ Attachment state: ${attachment.State}`)
    } else {
      details.push(`❌ No attachment found for VPC ${vpcId}`)
    }
    
    // Check if gateway is properly attached
    // Note: AWS sometimes returns "available" instead of "attached" for working IGWs
    const isAttached = attachment?.State === 'attached' || (attachment?.State as any) === 'available'
    
    return {
      isValid: isAttached,
      message: isAttached ? 'Internet Gateway properly attached to VPC' : `Internet Gateway attachment state: ${attachment?.State || 'not found'}`,
      details,
      gatewayId: igw.InternetGatewayId
    }
    
  } catch (error: any) {
    details.push(`❌ Error checking Internet Gateway: ${error.message}`)
    return {
      isValid: false,
      message: 'Error validating Internet Gateway',
      details
    }
  }
}

/**
 * Validate NAT Gateway
 */
async function validateNATGateway(ec2Client: EC2Client, vpcId: string): Promise<{
  isValid: boolean
  message: string
  details: string[]
  natGateways: string[]
}> {
  const details: string[] = []
  
  try {
    const response = await ec2Client.send(new DescribeNatGatewaysCommand({
      Filter: [
        { Name: 'vpc-id', Values: [vpcId] }
      ]
    }))
    
    const natGateways = response.NatGateways || []
    const activeNatGateways = natGateways.filter(nat => nat.State === 'available')
    
    details.push(`Found ${natGateways.length} NAT Gateways, ${activeNatGateways.length} active`)
    
    if (activeNatGateways.length === 0) {
      details.push('❌ No active NAT Gateways found')
      return {
        isValid: false,
        message: 'No NAT Gateway found for private subnet internet access',
        details,
        natGateways: []
      }
    }
    
    // Check if NAT Gateways are in public subnets
    for (const nat of activeNatGateways) {
      details.push(`✅ NAT Gateway ${nat.NatGatewayId} in subnet ${nat.SubnetId}`)
    }
    
    return {
      isValid: true,
      message: `${activeNatGateways.length} NAT Gateway(s) configured for outbound access`,
      details,
      natGateways: activeNatGateways.map(nat => nat.NatGatewayId!).filter(Boolean)
    }
    
  } catch (error: any) {
    details.push(`❌ Error checking NAT Gateways: ${error.message}`)
    return {
      isValid: false,
      message: 'Error validating NAT Gateways',
      details,
      natGateways: []
    }
  }
}

/**
 * Validate route table configuration
 */
async function validateRouteTableConfiguration(ec2Client: EC2Client, vpcId: string): Promise<{
  isValid: boolean
  message: string
  details: string[]
}> {
  const details: string[] = []
  
  try {
    // Get route tables
    const routeTablesResponse = await ec2Client.send(new DescribeRouteTablesCommand({
      Filters: [
        { Name: 'vpc-id', Values: [vpcId] }
      ]
    }))
    
    const routeTables = routeTablesResponse.RouteTables || []
    details.push(`Found ${routeTables.length} route tables in VPC`)
    
    // Get subnets for tier classification
    const subnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({
      Filters: [
        { Name: 'vpc-id', Values: [vpcId] }
      ]
    }))
    
    const subnets = subnetsResponse.Subnets || []
    
    // Classify subnets by route table analysis
    const publicSubnets: any[] = []
    const privateSubnets: any[] = []
    const internalSubnets: any[] = []
    
    for (const subnet of subnets) {
      const tier = classifySubnetByRoutes(subnet, routeTables)
      
      switch (tier) {
        case 'public':
          publicSubnets.push(subnet)
          break
        case 'private':
          privateSubnets.push(subnet)
          break
        case 'internal':
          internalSubnets.push(subnet)
          break
      }
      
      details.push(`${subnet.SubnetId} (${subnet.CidrBlock}): ${tier} tier`)
    }
    
    details.push(`Three-tier classification:`)
    details.push(`  - Public: ${publicSubnets.length} subnets (route via IGW)`)
    details.push(`  - Private: ${privateSubnets.length} subnets (route via NAT)`)
    details.push(`  - Internal: ${internalSubnets.length} subnets (no internet routes)`)
    
    // Validate three-tier architecture implementation
    let hasPublicTier = publicSubnets.length > 0
    let hasPrivateTier = privateSubnets.length > 0
    let hasInternalTier = internalSubnets.length > 0
    
    // Check route table types
    let publicRoutes = 0
    let privateRoutes = 0
    let internalRoutes = 0
    let hasInternetRoutes = false
    let hasNATRoutes = false
    
    for (const rt of routeTables) {
      const isMainRouteTable = rt.Associations?.some(assoc => assoc.Main)
      const associatedSubnets = rt.Associations?.filter(assoc => assoc.SubnetId).length || 0
      
      details.push(`Route table ${rt.RouteTableId}: ${isMainRouteTable ? 'Main' : 'Custom'}, ${associatedSubnets} subnets`)
      
      // Analyze routes
      let hasInternetRoute = false
      
      for (const route of rt.Routes || []) {
        if (route.DestinationCidrBlock === '0.0.0.0/0') {
          hasInternetRoute = true
          if (route.GatewayId?.startsWith('igw-')) {
            hasInternetRoutes = true
            publicRoutes++
            details.push(`  ✅ Internet route via IGW ${route.GatewayId}`)
          } else if (route.NatGatewayId) {
            hasNATRoutes = true
            privateRoutes++
            details.push(`  ✅ Internet route via NAT ${route.NatGatewayId}`)
          }
        }
      }
      
      if (!hasInternetRoute && !isMainRouteTable) {
        internalRoutes++
        details.push(`  ✅ Internal route table (no internet access)`)
      }
    }
    
    // Validate implementation
    let isValid = true
    const issues: string[] = []
    
    if (!hasPublicTier) {
      isValid = false
      issues.push('Missing public tier subnets')
      details.push('❌ No public tier subnets found (need IGW routes)')
    } else {
      details.push('✅ Public tier properly implemented')
    }
    
    if (!hasPrivateTier) {
      isValid = false
      issues.push('Missing private tier subnets')
      details.push('❌ No private tier subnets found (need NAT routes)')
    } else {
      details.push('✅ Private tier properly implemented')
    }
    
    if (!hasInternalTier) {
      isValid = false
      issues.push('Missing internal tier subnets')
      details.push('❌ No internal tier subnets found (need no internet routes)')
    } else {
      details.push('✅ Internal tier properly implemented')
    }
    
    if (!hasInternetRoutes) {
      isValid = false
      issues.push('No public internet routes found')
      details.push('❌ No route tables with Internet Gateway routes')
    }
    
    if (!hasNATRoutes) {
      isValid = false
      issues.push('No NAT Gateway routes for private access')
      details.push('❌ No route tables with NAT Gateway routes')
    }
    
    if (internalRoutes === 0) {
      isValid = false
      issues.push('No internal-only route tables found')
      details.push('❌ No route tables without internet access (internal tier)')
    }
    
    const message = isValid ?
      'Route tables properly implement three-tier defense in depth' :
      `Route table issues: ${issues.join(', ')}`
    
    return { isValid, message, details }
    
  } catch (error: any) {
    details.push(`❌ Error analyzing route tables: ${error.message}`)
    return {
      isValid: false,
      message: 'Error validating route table configuration',
      details
    }
  }
}

/**
 * Classify subnet tier based on route table configuration
 */
function classifySubnetByRoutes(subnet: any, routeTables: any[]): string {
  // Find route table for this subnet
  let subnetRouteTable = null
  
  // Look for explicit subnet association
  for (const routeTable of routeTables) {
    const hasSubnetAssociation = routeTable.Associations?.some((assoc: any) => 
      assoc.SubnetId === subnet.SubnetId
    )
    if (hasSubnetAssociation) {
      subnetRouteTable = routeTable
      break
    }
  }
  
  // If no explicit association, use main route table
  if (!subnetRouteTable) {
    subnetRouteTable = routeTables.find(rt => 
      rt.Associations?.some((assoc: any) => assoc.Main === true)
    )
  }
  
  if (!subnetRouteTable) {
    return 'unknown'
  }
  
  // Analyze routes to determine tier
  for (const route of subnetRouteTable.Routes || []) {
    if (route.DestinationCidrBlock === '0.0.0.0/0') {
      if (route.GatewayId?.startsWith('igw-')) {
        return 'public' // Routes to internet via Internet Gateway
      } else if (route.NatGatewayId) {
        return 'private' // Routes to internet via NAT Gateway
      }
    }
  }
  
  // No internet routes = internal tier
  return 'internal'
}