import { AppShell, Burger, Group, Title, Text, Container, Card, Badge, Button, Stack, Textarea, Paper, Alert, Code, Divider, Flex, Collapse, List, ThemeIcon } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconShieldCheck, IconServer, IconDatabase, IconKey, IconAlertCircle, IconCheck, IconNetwork, IconX, IconExclamationMark, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useState, useEffect } from 'react'

interface TestCondition {
  name: string
  description: string
  status: 'pass' | 'fail' | 'error' | 'warning'
  message: string
  details?: string
}

interface Exercise {
  id: string
  title: string
  description: string
  status: 'pending' | 'checking' | 'passed' | 'failed'
  category: 'iam' | 's3' | 'ec2' | 'rds' | 'general' | 'vpc' | 'lb'
  points: number
  lastResult?: {
    passed: boolean
    message: string
    testResults?: TestCondition[]
    details?: any
  }
}

interface AWSAccountInfo {
  accountId: string
  arn: string
  userId: string
  region: string
  userName?: string
}

function App() {
  const [opened, { toggle }] = useDisclosure()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [credentialsText, setCredentialsText] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [accountInfo, setAccountInfo] = useState<AWSAccountInfo | null>(null)
  const [credentialsError, setCredentialsError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Only fetch exercises if authenticated
    if (isAuthenticated) {
      fetch('/api/exercises')
        .then(res => res.json())
        .then(data => setExercises(data))
        .catch(err => console.error('Failed to fetch exercises:', err))
    }
  }, [isAuthenticated])

  const validateCredentials = async () => {
    if (!credentialsText.trim()) {
      setCredentialsError('Please enter your AWS credentials')
      return
    }

    setIsValidating(true)
    setCredentialsError(null)

    try {
      const response = await fetch('/api/credentials/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentialsText })
      })

      const result = await response.json()

      if (result.success && result.data.isValid) {
        setAccountInfo(result.data.accountInfo)
        setSessionId(result.data.sessionId)
        setIsAuthenticated(true)
        setCredentialsError(null)
      } else {
        setCredentialsError(result.data?.error || result.error || 'Invalid credentials')
        setIsAuthenticated(false)
        setAccountInfo(null)
        setSessionId(null)
      }
    } catch (error) {
      setCredentialsError('Failed to validate credentials. Please try again.')
      setIsAuthenticated(false)
      setAccountInfo(null)
      setSessionId(null)
    } finally {
      setIsValidating(false)
    }
  }

  const checkExercise = async (exerciseId: string) => {
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, status: 'checking' } : ex
    ))

    try {
      const response = await fetch(`/api/exercises/${exerciseId}/check`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })
      const result = await response.json()
      
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId ? { 
          ...ex, 
          status: result.passed ? 'passed' : 'failed',
          lastResult: result
        } : ex
      ))
    } catch (error) {
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId ? { 
          ...ex, 
          status: 'failed',
          lastResult: { 
            passed: false, 
            message: 'Failed to run exercise check',
            details: { error: 'Network or server error' }
          }
        } : ex
      ))
    }
  }

  const getStatusColor = (status: Exercise['status']) => {
    switch (status) {
      case 'passed': return 'green'
      case 'failed': return 'red'
      case 'checking': return 'yellow'
      default: return 'gray'
    }
  }

  const getCategoryIcon = (category: Exercise['category']) => {
    switch (category) {
      case 'iam': return <IconKey size={20} />
      case 's3': return <IconDatabase size={20} />
      case 'ec2': return <IconServer size={20} />
      case 'rds': return <IconDatabase size={20} />
      case 'vpc': return <IconNetwork size={20} />
      case 'lb': return <IconNetwork size={20} />
      default: return <IconShieldCheck size={20} />
    }
  }

  const getTestStatusIcon = (status: TestCondition['status']) => {
    switch (status) {
      case 'pass': return <IconCheck size={16} color="green" />
      case 'fail': return <IconX size={16} color="red" />
      case 'error': return <IconExclamationMark size={16} color="orange" />
      case 'warning': return <IconExclamationMark size={16} color="yellow" />
      default: return <IconAlertCircle size={16} color="gray" />
    }
  }

  const getTestStatusColor = (status: TestCondition['status']) => {
    switch (status) {
      case 'pass': return 'green'
      case 'fail': return 'red'
      case 'error': return 'orange'
      case 'warning': return 'yellow'
      default: return 'gray'
    }
  }

  const toggleResultExpansion = (exerciseId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Group>
            <IconShieldCheck size={30} color="blue" />
            <Title order={3}>AWS Cybersecurity Workshop</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Title order={4} mb="md">Categories</Title>
        <Stack>
          <Button variant="light" leftSection={<IconKey size={16} />}>IAM Security</Button>
          <Button variant="light" leftSection={<IconDatabase size={16} />}>S3 Security</Button>
          <Button variant="light" leftSection={<IconServer size={16} />}>EC2 Security</Button>
          <Button variant="light" leftSection={<IconDatabase size={16} />}>RDS Security</Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container>
          {!isAuthenticated ? (
            <Stack>
              <Title order={2} mb="md">AWS Credentials Setup</Title>
              <Text c="dimmed" mb="xl">
                Enter your AWS credentials to begin validating your cybersecurity configuration.
              </Text>

              {accountInfo && (
                <Alert icon={<IconCheck size={16} />} title="Credentials Validated!" color="green" mb="md">
                  <Text size="sm">Successfully connected to AWS account <Code>{accountInfo.accountId}</Code></Text>
                  <Text size="sm">Region: <Code>{accountInfo.region}</Code></Text>
                  <Text size="sm">User ARN: <Code>{accountInfo.arn}</Code></Text>
                  {accountInfo.userName && <Text size="sm">User: <Code>{accountInfo.userName}</Code></Text>}
                </Alert>
              )}

              {credentialsError && (
                <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
                  {credentialsError}
                </Alert>
              )}

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Enter AWS Credentials (INI Format)</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Paste your AWS credentials in the standard INI format:
                </Text>
                
                <Paper p="md" bg="gray.0" mb="md">
                  <Code block>
{`[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
aws_session_token=YOUR_SESSION_TOKEN`}
                  </Code>
                </Paper>

                <Textarea
                  placeholder="Paste your AWS credentials here..."
                  value={credentialsText}
                  onChange={(event) => setCredentialsText(event.currentTarget.value)}
                  minRows={6}
                  mb="md"
                />

                <Flex justify="space-between" align="center">
                  <Button 
                    loading={isValidating}
                    onClick={validateCredentials}
                    disabled={!credentialsText.trim()}
                  >
                    {isValidating ? 'Validating...' : 'Validate Credentials'}
                  </Button>
                  
                  {accountInfo && (
                    <Button 
                      variant="light"
                      onClick={() => setIsAuthenticated(true)}
                    >
                      Continue to Exercises
                    </Button>
                  )}
                </Flex>
              </Card>
            </Stack>
          ) : (
            <Stack>
              <Flex justify="space-between" align="center">
                <div>
                  <Title order={2} mb="sm">Security Exercises</Title>
                  <Text c="dimmed">
                    Validate your AWS security configurations with these exercises.
                  </Text>
                </div>
                <Card p="sm" withBorder>
                  <Text size="sm" fw={500}>Account: <Code>{accountInfo?.accountId}</Code></Text>
                  <Text size="xs" c="dimmed">Region: {accountInfo?.region}</Text>
                </Card>
              </Flex>
              
              <Divider my="md" />

              <Stack>
                {exercises.length === 0 ? (
                  <Text>Loading exercises...</Text>
                ) : (
                  exercises.map((exercise) => (
                    <Card key={exercise.id} shadow="sm" padding="lg" radius="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Group>
                          {getCategoryIcon(exercise.category)}
                          <div>
                            <Title order={5}>{exercise.title}</Title>
                            <Text size="xs" c="dimmed">{exercise.points} point{exercise.points > 1 ? 's' : ''}</Text>
                          </div>
                        </Group>
                        <Badge color={getStatusColor(exercise.status)} variant="light">
                          {exercise.status}
                        </Badge>
                      </Group>

                      <Text size="sm" c="dimmed" mb="md">
                        {exercise.description}
                      </Text>

                      {exercise.lastResult && (
                        <Stack spacing="xs" mb="md">
                          <Group justify="space-between">
                            <Text size="sm" fw={500} c={exercise.lastResult.passed ? 'green' : 'red'}>
                              {exercise.lastResult.message}
                            </Text>
                            {exercise.lastResult.testResults && exercise.lastResult.testResults.length > 0 && (
                              <Button 
                                variant="subtle" 
                                size="xs"
                                leftSection={expandedResults.has(exercise.id) ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                onClick={() => toggleResultExpansion(exercise.id)}
                              >
                                {expandedResults.has(exercise.id) ? 'Hide' : 'Show'} Details
                              </Button>
                            )}
                          </Group>

                          <Collapse in={expandedResults.has(exercise.id)}>
                            {exercise.lastResult.testResults && (
                              <Card withBorder p="md" bg="gray.0">
                                <Title order={6} mb="sm">Test Results</Title>
                                <List spacing="xs">
                                  {exercise.lastResult.testResults.map((test, index) => (
                                    <List.Item key={index} icon={getTestStatusIcon(test.status)}>
                                      <Stack spacing={2}>
                                        <Group justify="space-between">
                                          <Text size="sm" fw={500}>{test.description}</Text>
                                          <Badge size="xs" color={getTestStatusColor(test.status)}>
                                            {test.status}
                                          </Badge>
                                        </Group>
                                        <Text size="xs" c="dimmed">{test.message}</Text>
                                        {test.details && (
                                          <Text size="xs" c="dimmed" fs="italic">{test.details}</Text>
                                        )}
                                      </Stack>
                                    </List.Item>
                                  ))}
                                </List>
                                
                                {exercise.lastResult.details?.summary && (
                                  <Text size="xs" c="dimmed" mt="sm">
                                    Summary: {exercise.lastResult.details.summary}
                                  </Text>
                                )}
                              </Card>
                            )}
                          </Collapse>
                        </Stack>
                      )}

                      <Button 
                        variant="light" 
                        loading={exercise.status === 'checking'}
                        onClick={() => checkExercise(exercise.id)}
                        disabled={exercise.status === 'checking'}
                      >
                        {exercise.status === 'checking' ? 'Checking...' : 'Check Exercise'}
                      </Button>
                    </Card>
                  ))
                )}
              </Stack>
              
              <Button variant="subtle" onClick={() => {
                setIsAuthenticated(false)
                setAccountInfo(null)
                setCredentialsText('')
                setCredentialsError(null)
                setSessionId(null)
              }}>
                Change Credentials
              </Button>
            </Stack>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App