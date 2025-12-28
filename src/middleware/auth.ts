// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '../config/clerk';
import { AuthRequest } from '../types';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Fixed: Verify token correctly with Clerk
    try {
      const payload = await clerkClient.verifyToken(token);
      
      if (!payload || !payload.sub) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }

      // Attach user info to request
      (req as AuthRequest).auth = {
        userId: payload.sub,
        sessionId: payload.sid as string,
      };

      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const payload = await clerkClient.verifyToken(token);
        
        if (payload && payload.sub) {
          (req as AuthRequest).auth = {
            userId: payload.sub,
            sessionId: payload.sid as string,
          };
        }
      } catch (verifyError) {
        // Silently fail for optional auth
        console.log('Optional auth verification failed');
      }
    }
    
    next();
  } catch (error) {
    // Continue even if auth fails
    next();
  }
};