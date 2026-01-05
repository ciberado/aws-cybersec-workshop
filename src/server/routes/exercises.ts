import { Router } from 'express'
import type { Exercise, ExerciseResult, APIResponse } from '../../shared/types.js'
import { validateS3DataBucket, validateS3WebBucket, validateVPCArchitecture, validateRouteTables, validateSecurityGroups, validateRDSProtection, validateALBConfiguration, validateLaunchTemplate, validateAutoScalingGroup } from '../validators/index.js'
import { getStoredCredentials } from './credentials.js'

const router = Router()

// Workshop exercises based on the README requirements
const exercises: Exercise[] = [
  {
    id: 's3-data-bucket',
    title: 'S3 Data Bucket Security',
    description: 'Verify pokemon.csv is accessible only with IAM credentials (no public access)',
    category: 's3',
    checkFunction: 'checkS3DataBucket',
    points: 1
  },
  {
    id: 's3-web-bucket',
    title: 'S3 Web Bucket Configuration',
    description: 'Verify web bucket hosting with public access to index.html only',
    category: 's3',
    checkFunction: 'checkS3WebBucket',
    points: 1
  },
  {
    id: 'vpc-architecture',
    title: 'VPC Network Design',
    description: 'Validate VPC CIDR design and subnet segmentation (public/private/internal tiers)',
    category: 'vpc',
    checkFunction: 'checkVPCArchitecture',
    points: 1
  },
  {
    id: 'route-tables',
    title: 'Network Route Tables',
    description: 'Verify traffic control and routing between security tiers',
    category: 'vpc',
    checkFunction: 'checkRouteTables',
    points: 2
  },
  {
    id: 'security-groups',
    title: 'Security Groups Microsegmentation',
    description: 'Validate albsg, appsg, and bdsg security groups with proper rules',
    category: 'ec2',
    checkFunction: 'checkSecurityGroups',
    points: 1
  },
  {
    id: 'rds-protection',
    title: 'RDS Database Protection',
    description: 'Verify PostgreSQL database in internal subnets with Multi-AZ configuration',
    category: 'rds',
    checkFunction: 'checkRDSProtection',
    points: 1
  },
  {
    id: 'load-balancer',
    title: 'Application Load Balancer',
    description: 'Validate ALB configuration with proper target group and health checks',
    category: 'lb',
    checkFunction: 'checkLoadBalancer',
    points: 1
  },
  {
    id: 'launch-template',
    title: 'Launch Template Security',
    description: 'Verify secure launch template with IAM role and user data configuration',
    category: 'ec2',
    checkFunction: 'checkLaunchTemplate',
    points: 1
  },
  {
    id: 'auto-scaling',
    title: 'Auto Scaling Group',
    description: 'Validate ASG in private subnets with target group integration',
    category: 'ec2',
    checkFunction: 'checkAutoScaling',
    points: 1
  }
]

// GET /api/exercises - Get all exercises
router.get('/', (_req, res) => {
  const response: APIResponse<Exercise[]> = {
    success: true,
    data: exercises
  }
  res.json(response.data)
})

// POST /api/exercises/:id/check - Check a specific exercise
router.post('/:id/check', async (req, res) => {
  const { id } = req.params
  const { sessionId } = req.body
  const exercise = exercises.find(ex => ex.id === id)

  if (!exercise) {
    const response: APIResponse = {
      success: false,
      error: 'Exercise not found'
    }
    return res.status(404).json(response)
  }

  if (!sessionId) {
    const response: APIResponse = {
      success: false,
      error: 'Session ID required for exercise validation'
    }
    return res.status(400).json(response)
  }

  const credentials = getStoredCredentials(sessionId)
  if (!credentials) {
    const response: APIResponse = {
      success: false,
      error: 'Valid AWS credentials required. Please validate credentials first.'
    }
    return res.status(401).json(response)
  }

  try {
    const result = await checkExercise(exercise, credentials)
    
    res.json(result)
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
    res.status(500).json(response)
  }
})

// Exercise checking logic - now with real AWS validation
async function checkExercise(exercise: Exercise, credentials: any): Promise<ExerciseResult> {
  switch (exercise.id) {
    case 's3-data-bucket':
      return await validateS3DataBucket(credentials)
    
    case 's3-web-bucket':
      return await validateS3WebBucket(credentials)
    
    case 'vpc-architecture':
      return await validateVPCArchitecture(credentials)
    
    case 'route-tables':
      return await validateRouteTables(credentials)
    
    case 'security-groups':
      return await validateSecurityGroups(credentials)
    
    case 'rds-protection':
      return await validateRDSProtection(credentials)
    
    case 'load-balancer':
      return await validateALBConfiguration(credentials)
    
    case 'launch-template':
      return await validateLaunchTemplate(credentials)
    
    case 'auto-scaling':
      return await validateAutoScalingGroup(credentials)
    
    default:
      throw new Error(`Unknown exercise: ${exercise.id}`)
  }
}

export default router