// routes/request.routes.ts
import express from 'express';
import {
  createWebsiteRequest,
  getUserRequests,
  getRequestById,
  updateWebsiteRequest,
  checkSubmissionLimit,
} from '../controllers/request.controller';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/requests/check-limit
 * @desc    Check if user can submit a new request (rate limit check)
 * @access  Private
 */
router.get('/check-limit', checkSubmissionLimit);

/**
 * @route   POST /api/requests
 * @desc    Create a new website request
 * @access  Private
 */
router.post('/', createWebsiteRequest);

/**
 * @route   GET /api/requests
 * @desc    Get all requests for logged-in user
 * @access  Private
 */
router.get('/', getUserRequests);

/**
 * @route   GET /api/requests/:id
 * @desc    Get a single request by ID
 * @access  Private
 */
router.get('/:id', getRequestById);

/**
 * @route   PATCH /api/requests/:id
 * @desc    Update a website request (only if editable)
 * @access  Private
 */
router.patch('/:id', updateWebsiteRequest);

export default router;