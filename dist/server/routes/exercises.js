import { Router } from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import { validateS3DataBucket, validateS3WebBucket, validateVPCArchitecture, validateRouteTables, validateSecurityGroups, validateRDSProtection, validateALBConfiguration, validateLaunchTemplate, validateAutoScalingGroup } from '../validators/index.js';
import { getStoredCredentials, getStoredStudentInfo } from './credentials.js';
const router = Router();
// CSV file for storing evaluation results
const CSV_FILE_PATH = join(process.cwd(), 'evaluation_results.csv');
const CSV_HEADERS = 'timestamp,student_surnames,student_name,aws_account_id,aws_region,total_score,max_score,percentage,exercise_results\n';
// Simple mutex for file access (in production, use proper locking mechanism)
let isWritingCsv = false;
const csvWriteQueue = [];
// Ensure CSV file exists with headers
async function ensureCsvFile() {
    try {
        await fs.access(CSV_FILE_PATH);
    }
    catch {
        // File doesn't exist, create it with headers
        await fs.writeFile(CSV_FILE_PATH, CSV_HEADERS);
    }
}
// Safely write to CSV with concurrent access handling
async function writeToCsv(data) {
    return new Promise((resolve, reject) => {
        const writeTask = async () => {
            try {
                await ensureCsvFile();
                await fs.appendFile(CSV_FILE_PATH, data);
                resolve();
            }
            catch (error) {
                reject(error);
            }
            finally {
                isWritingCsv = false;
                // Process next item in queue
                const nextTask = csvWriteQueue.shift();
                if (nextTask) {
                    isWritingCsv = true;
                    nextTask();
                }
            }
        };
        if (isWritingCsv) {
            // Add to queue
            csvWriteQueue.push(writeTask);
        }
        else {
            // Execute immediately
            isWritingCsv = true;
            writeTask();
        }
    });
}
// Format exercise results as JSON string for CSV
function formatExerciseResults(exercises) {
    const results = exercises.map(ex => ({
        id: ex.id,
        title: ex.title,
        status: 'pending', // Default status since we don't track state server-side yet
        points: ex.points,
        passed: false
    }));
    return JSON.stringify(results).replace(/"/g, '""'); // Escape quotes for CSV
}
// Workshop exercises based on the README requirements
const exercises = [
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
];
// GET /api/exercises - Get all exercises
router.get('/', (_req, res) => {
    const response = {
        success: true,
        data: exercises
    };
    res.json(response);
});
// POST /api/exercises/submit - Submit evaluation results
router.post('/submit', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            const response = {
                success: false,
                error: 'Session ID is required'
            };
            return res.status(400).json(response);
        }
        // Get stored credentials and student info
        const credentials = getStoredCredentials(sessionId);
        const studentInfo = getStoredStudentInfo(sessionId);
        if (!credentials || !studentInfo) {
            const response = {
                success: false,
                error: 'Session not found or expired'
            };
            return res.status(404).json(response);
        }
        // Calculate basic scores (simplified version for demo)
        const maxScore = exercises.reduce((sum, ex) => sum + ex.points, 0);
        const timestamp = new Date().toISOString();
        const exerciseResultsJson = formatExerciseResults(exercises);
        // Create CSV row with current submission
        const csvRow = `"${timestamp}","${studentInfo.surnames}","${studentInfo.name}","evaluation-session","${credentials.region || 'us-east-1'}","0","${maxScore}","0","${exerciseResultsJson}"\n`;
        await writeToCsv(csvRow);
        const response = {
            success: true,
            data: {
                message: 'Evaluation submitted successfully',
                timestamp,
                submissionId: `${sessionId}-${Date.now()}`
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Submission error:', error);
        const response = {
            success: false,
            error: 'Failed to submit evaluation'
        };
        res.status(500).json(response);
    }
});
// POST /api/exercises/:id/check - Check a specific exercise
router.post('/:id/check', async (req, res) => {
    const { id } = req.params;
    const { sessionId } = req.body;
    const exercise = exercises.find(ex => ex.id === id);
    if (!exercise) {
        const response = {
            success: false,
            error: 'Exercise not found'
        };
        return res.status(404).json(response);
    }
    if (!sessionId) {
        const response = {
            success: false,
            error: 'Session ID required for exercise validation'
        };
        return res.status(400).json(response);
    }
    const credentials = getStoredCredentials(sessionId);
    if (!credentials) {
        const response = {
            success: false,
            error: 'Valid AWS credentials required. Please validate credentials first.'
        };
        return res.status(401).json(response);
    }
    try {
        const result = await checkExercise(exercise, credentials);
        res.json(result);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
        res.status(500).json(response);
    }
});
// Exercise checking logic - now with real AWS validation
async function checkExercise(exercise, credentials) {
    switch (exercise.id) {
        case 's3-data-bucket':
            return await validateS3DataBucket(credentials);
        case 's3-web-bucket':
            return await validateS3WebBucket(credentials);
        case 'vpc-architecture':
            return await validateVPCArchitecture(credentials);
        case 'route-tables':
            return await validateRouteTables(credentials);
        case 'security-groups':
            return await validateSecurityGroups(credentials);
        case 'rds-protection':
            return await validateRDSProtection(credentials);
        case 'load-balancer':
            return await validateALBConfiguration(credentials);
        case 'launch-template':
            return await validateLaunchTemplate(credentials);
        case 'auto-scaling':
            return await validateAutoScalingGroup(credentials);
        default:
            throw new Error(`Unknown exercise: ${exercise.id}`);
    }
}
export default router;
