import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import exerciseRoutes from './routes/exercises.js'
import credentialsRoutes from './routes/credentials.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3002
const HOST = process.env.HOST || '0.0.0.0'

// Trust proxy for load balancer
app.set('trust proxy', true)

// Middleware
app.use(express.json())
app.use(express.static(join(__dirname, '../client')))

// API Routes
app.use('/api/exercises', exerciseRoutes)
app.use('/api/credentials', credentialsRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Serve React app for all other routes
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../client/index.html'))
})

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`)
  console.log(`📚 API docs available at http://${HOST}:${PORT}/api/health`)
  console.log(`🌐 Ready for external connections`)
})

export default app