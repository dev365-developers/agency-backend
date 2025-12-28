// routes/admin.routes.ts
import express from 'express';
import { requireAdmin, logAdminAction } from '../middleware/adminAuth';

// Request controllers
import {
  getAllRequests,
  getRequestDetails,
  updateRequestStatus,
  addInternalNotes,
  approveRequest,
  rejectRequest,
  getRequestStats,
} from '../controllers/admin.request.controller';

// Website controllers
import {
  getAllWebsites,
  getWebsiteDetails,
  updateWebsite,
  updateWebsiteStatus,
  addMilestone,
  updateMilestone,
  assignAdmin,
  getWebsiteStats,
} from '../controllers/admin.website.controller';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);
router.use(logAdminAction);

// ============================================
// REQUEST ROUTES
// ============================================

/**
 * @route   GET /api/admin/requests/stats
 * @desc    Get request statistics
 * @access  Private (Admin)
 */
router.get('/requests/stats', getRequestStats);

/**
 * @route   GET /api/admin/requests
 * @desc    Get all website requests with filtering/pagination
 * @access  Private (Admin)
 * @query   status, projectType, search, page, limit
 */
router.get('/requests', getAllRequests);

/**
 * @route   GET /api/admin/requests/:id
 * @desc    Get single request with full details
 * @access  Private (Admin)
 */
router.get('/requests/:id', getRequestDetails);

/**
 * @route   PATCH /api/admin/requests/:id/status
 * @desc    Update request status
 * @access  Private (Admin)
 * @body    { status: RequestStatus, internalNotes?: string }
 */
router.patch('/requests/:id/status', updateRequestStatus);

/**
 * @route   PATCH /api/admin/requests/:id/notes
 * @desc    Add/update internal notes
 * @access  Private (Admin)
 * @body    { internalNotes: string }
 */
router.patch('/requests/:id/notes', addInternalNotes);

/**
 * @route   POST /api/admin/requests/:id/approve
 * @desc    Approve request and create website
 * @access  Private (Admin)
 * @body    { assignedAdmin?: string, initialNotes?: string }
 */
router.post('/requests/:id/approve', approveRequest);

/**
 * @route   POST /api/admin/requests/:id/reject
 * @desc    Reject request
 * @access  Private (Admin)
 * @body    { reason: string }
 */
router.post('/requests/:id/reject', rejectRequest);

// ============================================
// WEBSITE ROUTES
// ============================================

/**
 * @route   GET /api/admin/websites/stats
 * @desc    Get website statistics
 * @access  Private (Admin)
 */
router.get('/websites/stats', getWebsiteStats);

/**
 * @route   GET /api/admin/websites
 * @desc    Get all websites with filtering/pagination
 * @access  Private (Admin)
 * @query   status, assignedAdmin, search, page, limit, sortBy, order
 */
router.get('/websites', getAllWebsites);

/**
 * @route   GET /api/admin/websites/:id
 * @desc    Get single website with full details
 * @access  Private (Admin)
 */
router.get('/websites/:id', getWebsiteDetails);

/**
 * @route   PATCH /api/admin/websites/:id
 * @desc    Update website (bulk update)
 * @access  Private (Admin)
 * @body    { name?, description?, status?, assignedAdmin?, domain?, etc. }
 */
router.patch('/websites/:id', updateWebsite);

/**
 * @route   PATCH /api/admin/websites/:id/status
 * @desc    Update website status specifically
 * @access  Private (Admin)
 * @body    { status: WebsiteStatus, notes?: string }
 */
router.patch('/websites/:id/status', updateWebsiteStatus);

/**
 * @route   PATCH /api/admin/websites/:id/assign
 * @desc    Assign admin to website
 * @access  Private (Admin)
 * @body    { assignedAdmin: string }
 */
router.patch('/websites/:id/assign', assignAdmin);

/**
 * @route   POST /api/admin/websites/:id/milestones
 * @desc    Add milestone to website
 * @access  Private (Admin)
 * @body    { title: string, completed?: boolean }
 */
router.post('/websites/:id/milestones', addMilestone);

/**
 * @route   PATCH /api/admin/websites/:id/milestones/:milestoneIndex
 * @desc    Update milestone
 * @access  Private (Admin)
 * @body    { title?: string, completed?: boolean }
 */
router.patch('/websites/:id/milestones/:milestoneIndex', updateMilestone);

export default router;