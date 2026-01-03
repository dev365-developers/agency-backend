// server.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

// Import configurations
import connectDatabase from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import requestRoutes from './routes/request.routes';
import supportRoutes from './routes/support.routes';
import adminRoutes from './routes/admin.routes';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler';

// 🔥 Import billing cron job
import { startBillingCron, startHourlyBillingCheck } from './jobs/billingCron';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'CLERK_SECRET_KEY',
  'RESEND_API_KEY',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(
    '❌ Missing required environment variables:',
    missingEnvVars.join(', ')
  );
  process.exit(1);
}

// Create Express app
const app: Application = express();

// Connect to database
connectDatabase();

// 🔥 PHASE 3: Start billing automation
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // Start daily billing check (runs at 2 AM)
  startBillingCron();
  
  // Optional: Start hourly check for more frequent updates
  // startHourlyBillingCheck();
  
  console.log('✅ Billing automation initialized');
}

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_DASHBOARD_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    billing: {
      cronActive: process.env.NODE_ENV !== 'production' || !process.env.VERCEL,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);

// 🔥 Manual billing check endpoint (for testing/manual trigger)
app.post('/api/admin/billing/check', async (req, res) => {
  try {
    const { updateBillingStatuses } = require('./jobs/billingCron');
    await updateBillingStatuses();
    res.status(200).json({
      success: true,
      message: 'Billing status check completed',
    });
  } catch (error) {
    console.error('Manual billing check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run billing check',
    });
  }
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Only start server if not in Vercel (serverless) environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Server is running on port ${PORT}                      
║  🌍 Environment: ${process.env.NODE_ENV}                  
║  📡 API URL: http://localhost:${PORT}                     
║  🔧 Admin endpoints: http://localhost:${PORT}/api/admin   
║  💳 Billing automation: ACTIVE                             
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  // Don't exit in serverless environment
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    process.exit(1);
  }
});

// Export the app for Vercel
export default app;