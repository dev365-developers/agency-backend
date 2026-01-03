// middleware/billingGuard.ts
import { Response, NextFunction } from 'express';
import Website, { BillingStatus } from '../models/Website';
import { AuthRequest } from '../types';

/**
 * 🔥 PHASE 4: Middleware to block access to suspended websites
 * 
 * This middleware checks if a website's billing is suspended
 * and blocks API access if payment is required
 */
export const checkBillingStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const websiteId = req.params.id || req.params.websiteId;
    
    if (!websiteId) {
      return next();
    }

    const website = await Website.findById(websiteId).select('billing status name');
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }

    // Check if billing is suspended
    if (website.billing.status === BillingStatus.SUSPENDED) {
      res.status(402).json({
        success: false,
        error: 'Payment Required',
        message: 'This website has been suspended due to non-payment. Please contact support to resolve billing issues.',
        billingStatus: website.billing.status,
        websiteId: website._id,
        websiteName: website.name,
      });
      return;
    }

    // Warn if overdue (but still allow access)
    if (website.billing.status === BillingStatus.OVERDUE) {
      console.warn(`⚠️  Website ${websiteId} is overdue but access still allowed`);
      // You can add a warning header
      res.setHeader('X-Billing-Status', 'OVERDUE');
      res.setHeader('X-Billing-Message', 'Payment is overdue. Service may be suspended soon.');
    }

    next();
  } catch (error) {
    console.error('Error in billing guard middleware:', error);
    next(error);
  }
};

/**
 * Strict billing check - blocks overdue as well as suspended
 */
export const strictBillingCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const websiteId = req.params.id || req.params.websiteId;
    
    if (!websiteId) {
      return next();
    }

    const website = await Website.findById(websiteId).select('billing status name');
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }

    // Block if suspended OR overdue
    if (
      website.billing.status === BillingStatus.SUSPENDED ||
      website.billing.status === BillingStatus.OVERDUE
    ) {
      res.status(402).json({
        success: false,
        error: 'Payment Required',
        message: website.billing.status === BillingStatus.SUSPENDED
          ? 'This website has been suspended due to non-payment.'
          : 'Payment is overdue. Please settle your account to continue.',
        billingStatus: website.billing.status,
        websiteId: website._id,
        websiteName: website.name,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error in strict billing check:', error);
    next(error);
  }
};

/**
 * Check if user has any suspended websites (for dashboard warnings)
 */
export const checkUserBillingStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth?.userId) {
      return next();
    }

    const suspendedCount = await Website.countDocuments({
      userId: req.auth.userId,
      'billing.status': BillingStatus.SUSPENDED,
    });

    const overdueCount = await Website.countDocuments({
      userId: req.auth.userId,
      'billing.status': BillingStatus.OVERDUE,
    });

    if (suspendedCount > 0 || overdueCount > 0) {
      res.setHeader('X-Billing-Warnings', 'true');
      res.setHeader('X-Suspended-Count', suspendedCount.toString());
      res.setHeader('X-Overdue-Count', overdueCount.toString());
    }

    next();
  } catch (error) {
    console.error('Error checking user billing status:', error);
    next();
  }
};