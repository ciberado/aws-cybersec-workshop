import { Router } from 'express'
import type { Exercise, ExerciseResult, APIResponse } from '../../shared/types.js'

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
router.get('/', (req, res) => {
  const response: APIResponse<Exercise[]> = {
    success: true,
    data: exercises
  }
  res.json(response.data)
})

// POST /api/exercises/:id/check - Check a specific exercise
router.post('/:id/check', async (req, res) => {
  const { id } = req.params
  const exercise = exercises.find(ex => ex.id === id)

  if (!exercise) {
    const response: APIResponse = {
      success: false,
      error: 'Exercise not found'
    }
    return res.status(404).json(response)
  }

  try {
    // Simulate exercise checking
    const result = await checkExercise(exercise)
    
    const response: APIResponse<ExerciseResult> = {
      success: true,
      data: result
    }
    res.json(result)
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
    res.status(500).json(response)
  }
})

// Simulate exercise checking logic
async function checkExercise(exercise: Exercise): Promise<ExerciseResult> {
  // Simulate async checking with random delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  // Simulate random success/failure for demo purposes
  const passed = Math.random() > 0.3
  
  const messages = {
    'iam-policies': passed ? 'All IAM policies follow least privilege principle' : 'Found overly permissive IAM policies',
    's3-bucket-security': passed ? 'All S3 buckets are properly secured' : 'Found publicly accessible S3 buckets',
    'ec2-security-groups': passed ? 'Security groups are properly configured' : 'Found security groups with overly permissive rules',
    'rds-security': passed ? 'RDS instances are properly secured' : 'Found RDS security issues',
    'vpc-security': passed ? 'VPC network configuration is secure' : 'Found VPC network security issues'
  }

  return {
    exerciseId: exercise.id,
    passed,
    message: messages[exercise.id as keyof typeof messages] || 'Check completed',
    details: {
      timestamp: new Date().toISOString(),
      checkFunction: exercise.checkFunction
    }
  }
}

export default router