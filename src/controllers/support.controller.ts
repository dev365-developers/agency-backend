// controllers/support.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import SupportRequest, { SupportStatus } from '../models/SupportRequest';
import Website from '../models/Website';
import WebsiteRequest from '../models/WebsiteRequest';
import { 
  sendSupportRequestAdminEmail, 
  sendSupportRequestUserEmail 
} from '../utils/emailService';

/**
 * @desc    Create support request
 * @route   POST /api/support
 * @access  Private (User)
 */
export const createSupportRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const { websiteId, category, subject, message } = req.body;

    // Validate required fields
    if (!websiteId || !category || !subject || !message) {
      res.status(400).json({
        success: false,
        error: 'Website, category, subject, and message are required',
      });
      return;
    }

    // Verify website belongs to user
    const website = await Website.findOne({ _id: websiteId, userId });

    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found or access denied',
      });
      return;
    }

    // Check for duplicate open requests (same category for same website)
    const existingRequest = await SupportRequest.findOne({
      userId,
      websiteId,
      category,
      status: SupportStatus.OPEN,
    });

    if (existingRequest) {
      res.status(400).json({
        success: false,
        error: `You already have an open ${category} request for this website. Please wait for it to be resolved before creating a new one.`,
      });
      return;
    }

    // Create support request
    const supportRequest = await SupportRequest.create({
      userId,
      websiteId,
      category,
      subject,
      message,
      status: SupportStatus.OPEN,
    });

    // Get website request for contact info
    const websiteRequest = await WebsiteRequest.findById(website.requestId);

    // Send email notifications
    try {
      if (websiteRequest) {
        await Promise.all([
          sendSupportRequestAdminEmail(supportRequest, website, websiteRequest),
          sendSupportRequestUserEmail(supportRequest, website, websiteRequest),
        ]);
      }
    } catch (emailError) {
      console.error('Failed to send support request emails:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully',
      data: supportRequest,
    });
  } catch (error: any) {
    console.error('Create support request error:', error);
    
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        error: 'You already have an open request for this category',
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create support request',
    });
  }
};

/**
 * @desc    Get user's support requests
 * @route   GET /api/support
 * @access  Private (User)
 */
export const getUserSupportRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const { status, websiteId, category } = req.query;

    // Build query
    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    if (websiteId) {
      query.websiteId = websiteId;
    }

    if (category) {
      query.category = category;
    }

    const supportRequests = await SupportRequest.find(query)
      .populate('website', 'name status deploymentUrl')
      .sort({ createdAt: -1 })
      .select('-internalNotes') // Don't send internal notes to user
      .lean();

    res.status(200).json({
      success: true,
      count: supportRequests.length,
      data: supportRequests,
    });
  } catch (error) {
    console.error('Get support requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support requests',
    });
  }
};

/**
 * @desc    Get single support request
 * @route   GET /api/support/:id
 * @access  Private (User)
 */
export const getSupportRequestById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const supportRequest = await SupportRequest.findOne({ _id: id, userId })
      .populate('website', 'name status deploymentUrl')
      .select('-internalNotes') // Don't send internal notes to user
      .lean();

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: 'Support request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: supportRequest,
    });
  } catch (error) {
    console.error('Get support request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support request',
    });
  }
};

/**
 * @desc    Get support requests for a specific website
 * @route   GET /api/support/website/:websiteId
 * @access  Private (User)
 */
export const getSupportRequestsByWebsite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const { websiteId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Verify website belongs to user
    const website = await Website.findOne({ _id: websiteId, userId });

    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found or access denied',
      });
      return;
    }

    const supportRequests = await SupportRequest.find({ websiteId, userId })
      .sort({ createdAt: -1 })
      .select('-internalNotes')
      .lean();

    res.status(200).json({
      success: true,
      count: supportRequests.length,
      data: supportRequests,
    });
  } catch (error) {
    console.error('Get website support requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support requests',
    });
  }
};