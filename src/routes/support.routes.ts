// routes/support.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createSupportRequest,
  getUserSupportRequests,
  getSupportRequestById,
  getSupportRequestsByWebsite,
} from '../controllers/support.controller';
import { supportRequestLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @route   POST /api/support
 * @desc    Create support request
 * @access  Private (User)
 * @body    { websiteId, category, subject, message }
 */
router.post('/',supportRequestLimiter, createSupportRequest);

/**
 * @route   GET /api/support
 * @desc    Get user's support requests
 * @access  Private (User)
 * @query   status?, websiteId?, category?
 */
router.get('/', getUserSupportRequests);

/**
 * @route   GET /api/support/website/:websiteId
 * @desc    Get support requests for specific website
 * @access  Private (User)
 */
router.get('/website/:websiteId', getSupportRequestsByWebsite);

/**
 * @route   GET /api/support/:id
 * @desc    Get single support request
 * @access  Private (User)
 */
router.get('/:id', getSupportRequestById);

export default router;