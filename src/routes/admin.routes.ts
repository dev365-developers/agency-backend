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
  updateBilling,
  recordPayment,
  addMilestone,
  updateMilestone,
  assignAdmin,
  getWebsiteStats,
} from '../controllers/admin.website.controller';

// User controllers
import {
  getAllUsers,
  getUserDetails,
  updateUser,
  getUserRequests,
  getUserWebsites,
  deleteUser,
  getUserStats,
} from '../controllers/admin.user.controller';

import {
  getAllSupportRequests,
  getSupportRequestDetails,
  updateSupportRequestStatus,
  updateSupportRequest,
  assignAdminToSupport,
  setSupportPriority,
  getSupportStats,
} from '../controllers/admin.support.controller';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);
router.use(logAdminAction);

// ============================================
// USER ROUTES
// ============================================

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin)
 */
router.get('/users/stats', getUserStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering/pagination
 * @access  Private (Admin)
 * @query   search, authProvider, page, limit, sortBy, order
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user with full details
 * @access  Private (Admin)
 */
router.get('/users/:id', getUserDetails);

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Update user information
 * @access  Private (Admin)
 * @body    { email?, firstName?, lastName?, imageUrl? }
 */
router.patch('/users/:id', updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
router.delete('/users/:id', deleteUser);

/**
 * @route   GET /api/admin/users/:id/requests
 * @desc    Get all requests for a specific user
 * @access  Private (Admin)
 * @query   status, projectType, page, limit
 */
router.get('/users/:id/requests', getUserRequests);

/**
 * @route   GET /api/admin/users/:id/websites
 * @desc    Get all websites for a specific user
 * @access  Private (Admin)
 * @query   status, page, limit
 */
router.get('/users/:id/websites', getUserWebsites);

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
 * @desc    Get website statistics (including billing stats)
 * @access  Private (Admin)
 */
router.get('/websites/stats', getWebsiteStats);

/**
 * @route   GET /api/admin/websites
 * @desc    Get all websites with filtering/pagination
 * @access  Private (Admin)
 * @query   status, billingStatus, assignedAdmin, search, page, limit, sortBy, order
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
 * @route   PATCH /api/admin/websites/:id/billing
 * @desc    Update billing information
 * @access  Private (Admin)
 * @body    { plan?, price?, billingCycle?, status? }
 */
router.patch('/websites/:id/billing', updateBilling);

/**
 * @route   POST /api/admin/websites/:id/payment
 * @desc    Record a payment for website
 * @access  Private (Admin)
 * @body    { amount: number, method?: string, transactionId?: string }
 */
router.post('/websites/:id/payment', recordPayment);

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

// ============================================
// SUPPORT ROUTES
// ============================================

/**
 * @route   GET /api/admin/support/stats
 * @desc    Get support request statistics
 * @access  Private (Admin)
 */
router.get('/support/stats', getSupportStats);

/**
 * @route   GET /api/admin/support
 * @desc    Get all support requests with filtering/pagination
 * @access  Private (Admin)
 * @query   status, priority, category, assignedAdmin, search, page, limit, sortBy, order
 */
router.get('/support', getAllSupportRequests);

/**
 * @route   GET /api/admin/support/:id
 * @desc    Get single support request with full details
 * @access  Private (Admin)
 */
router.get('/support/:id', getSupportRequestDetails);

/**
 * @route   PATCH /api/admin/support/:id
 * @desc    Update support request (bulk update)
 * @access  Private (Admin)
 * @body    { status?, priority?, assignedAdmin?, internalNotes? }
 */
router.patch('/support/:id', updateSupportRequest);

/**
 * @route   PATCH /api/admin/support/:id/status
 * @desc    Update support request status
 * @access  Private (Admin)
 * @body    { status: SupportStatus, internalNotes?: string }
 */
router.patch('/support/:id/status', updateSupportRequestStatus);

/**
 * @route   PATCH /api/admin/support/:id/notes
 * @desc    Add/update internal notes
 * @access  Private (Admin)
 * @body    { internalNotes: string }
 */
// router.patch('/support/:id/notes', addInternalNotes);

/**
 * @route   PATCH /api/admin/support/:id/assign
 * @desc    Assign admin to support request
 * @access  Private (Admin)
 * @body    { assignedAdmin: string }
 */
router.patch('/support/:id/assign', assignAdminToSupport);

/**
 * @route   PATCH /api/admin/support/:id/priority
 * @desc    Set priority for support request
 * @access  Private (Admin)
 * @body    { priority: "LOW" | "MEDIUM" | "HIGH" }
 */
router.patch('/support/:id/priority', setSupportPriority);

export default router;