// controllers/request.controller.ts
import { Response } from 'express';
import WebsiteRequest, { RequestStatus } from '../models/WebsiteRequest';
import { AuthRequest, CreateWebsiteRequestDTO, UpdateWebsiteRequestDTO } from '../types';
import { sendRequestNotificationEmail, sendAdminNotificationEmail } from '../utils/emailService';

// Helper function to check if user has submitted a request in last 24 hours
const checkRateLimit = async (userId: string): Promise<boolean> => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentRequest = await WebsiteRequest.findOne({
    userId,
    createdAt: { $gte: twentyFourHoursAgo },
  });
  
  return !!recentRequest;
};

/**
 * @desc    Create a new website request
 * @route   POST /api/requests
 * @access  Private
 */
export const createWebsiteRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    // Check rate limit: 1 request per 24 hours
    const hasRecentRequest = await checkRateLimit(userId);
    
    if (hasRecentRequest) {
      res.status(429).json({
        success: false,
        error: 'You can only submit one request per 24 hours. Please try again later.',
      });
      return;
    }
    
    const requestData: CreateWebsiteRequestDTO = req.body;
    
    // Validate required fields
    const requiredFields = [
      'projectName',
      'description',
      'projectType',
      'contactName',
      'contactEmail',
      'contactPhone',
    ];
    
    const missingFields = requiredFields.filter(field => !requestData[field as keyof CreateWebsiteRequestDTO]);
    
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
      return;
    }
    
    // Set editableUntil to 2 hours from now
    const editableUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
    
    // Create the request
    const websiteRequest = await WebsiteRequest.create({
      userId,
      ...requestData,
      status: RequestStatus.PENDING,
      editableUntil,
    });
    
    // Send email notifications (fire and forget - don't block the response)
    Promise.all([
      sendRequestNotificationEmail(websiteRequest),
      sendAdminNotificationEmail(websiteRequest),
    ]).catch(error => {
      console.error('Failed to send email notifications:', error);
    });
    
    res.status(201).json({
      success: true,
      message: 'Website request submitted successfully',
      data: websiteRequest,
    });
  } catch (error: any) {
    console.error('Error creating website request:', error);
    
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
      error: 'Failed to create website request',
    });
  }
};

/**
 * @desc    Get all requests for logged-in user
 * @route   GET /api/requests
 * @access  Private
 */
export const getUserRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    const requests = await WebsiteRequest.find({ userId })
      .sort({ createdAt: -1 }) // Newest first
      .select('-internalNotes'); // Exclude admin notes from user view
    
    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
};

/**
 * @desc    Get a single request by ID
 * @route   GET /api/requests/:id
 * @access  Private
 */
export const getRequestById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    const request = await WebsiteRequest.findOne({
      _id: id,
      userId, // Ensure user can only access their own requests
    }).select('-internalNotes');
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request',
    });
  }
};

/**
 * @desc    Update a website request (only if editable)
 * @route   PATCH /api/requests/:id
 * @access  Private
 */
export const updateWebsiteRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const updateData: UpdateWebsiteRequestDTO = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    // Find the request
    const request = await WebsiteRequest.findOne({
      _id: id,
      userId, // Ensure user owns this request
    });
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    // Check if request is still editable
    if (request.status !== RequestStatus.PENDING) {
      res.status(403).json({
        success: false,
        error: `Cannot edit request with status: ${request.status}. Only PENDING requests can be edited.`,
      });
      return;
    }
    
    if (new Date() > request.editableUntil) {
      res.status(403).json({
        success: false,
        error: 'Edit time window has expired. Requests can only be edited within 2 hours of submission.',
      });
      return;
    }
    
    // Fields that cannot be updated
    const protectedFields = ['userId', 'status', 'editableUntil', 'internalNotes', 'createdAt'];
    protectedFields.forEach(field => {
      delete updateData[field as keyof UpdateWebsiteRequestDTO];
    });
    
    // Update the request
    Object.assign(request, updateData);
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: request,
    });
  } catch (error: any) {
    console.error('Error updating website request:', error);
    
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
      error: 'Failed to update request',
    });
  }
};

/**
 * @desc    Check if user can submit a new request (rate limit check)
 * @route   GET /api/requests/check-limit
 * @access  Private
 */
export const checkSubmissionLimit = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    const hasRecentRequest = await checkRateLimit(userId);
    
    if (hasRecentRequest) {
      // Find the most recent request to get exact time
      const recentRequest = await WebsiteRequest.findOne({ userId })
        .sort({ createdAt: -1 })
        .limit(1);
      
      const nextAllowedTime = new Date(
        recentRequest!.createdAt.getTime() + 24 * 60 * 60 * 1000
      );
      
      res.status(200).json({
        success: true,
        canSubmit: false,
        nextAllowedTime,
        message: 'You have reached your submission limit',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      canSubmit: true,
      message: 'You can submit a new request',
    });
  } catch (error) {
    console.error('Error checking submission limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check submission limit',
    });
  }
};