// middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * HTTP Basic Authentication middleware for admin routes
 * 
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Proper WWW-Authenticate header for browser prompts
 * - Environment variable validation
 * - Clear error messages
 * 
 * Setup in .env:
 * ADMIN_USERNAME=your_admin_username
 * ADMIN_PASSWORD=your_strong_password
 */

// Validate admin credentials on startup
const validateAdminCredentials = (): void => {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.error('⚠️  ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }
  
  if (process.env.ADMIN_PASSWORD.length < 12) {
    console.error('⚠️  ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }
  
  console.log('Admin credentials validated');
};

// Call validation on module load
validateAdminCredentials();

/**
 * Constant-time string comparison to prevent timing attacks
 */
const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
};

/**
 * Admin authentication middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area", charset="UTF-8"');
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }
    
    // Extract and decode credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');
    
    // Validate credentials exist
    if (!username || !password) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area", charset="UTF-8"');
      res.status(401).json({
        success: false,
        error: 'Invalid credentials format',
      });
      return;
    }
    
    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME!;
    const adminPassword = process.env.ADMIN_PASSWORD!;
    
    // Secure comparison to prevent timing attacks
    const usernameMatch = secureCompare(username, adminUsername);
    const passwordMatch = secureCompare(password, adminPassword);
    
    if (!usernameMatch || !passwordMatch) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area", charset="UTF-8"');
      res.status(403).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }
    
    // Authentication successful
    // Add admin info to request for logging
    (req as any).admin = {
      username: adminUsername,
      authenticatedAt: new Date(),
    };
    
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Middleware to log admin actions for audit trail
 */
export const logAdminAction = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const admin = (req as any).admin;
  const { method, originalUrl, body } = req;
  
  console.log('Admin Action:', {
    admin: admin?.username,
    method,
    url: originalUrl,
    timestamp: new Date().toISOString(),
    // Don't log sensitive data
    bodyPreview: method === 'POST' || method === 'PATCH' 
      ? Object.keys(body).join(', ') 
      : undefined,
  });
  
  next();
};