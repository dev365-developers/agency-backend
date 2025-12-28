// controllers/admin.request.controller.ts
import { Request, Response } from 'express';
import WebsiteRequest, { RequestStatus } from '../models/WebsiteRequest';
import Website, { WebsiteStatus } from '../models/Website';
import { sendClientApprovalEmail } from '../utils/emailService';

/**
 * @desc    Get all website requests (admin view)
 * @route   GET /api/admin/requests
 * @access  Private (Admin)
 */
export const getAllRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, projectType, search, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (projectType) {
      query.projectType = projectType;
    }
    
    if (search) {
      query.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const [requests, total] = await Promise.all([
      WebsiteRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WebsiteRequest.countDocuments(query),
    ]);
    
    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
};

/**
 * @desc    Get single request with full details (admin view)
 * @route   GET /api/admin/requests/:id
 * @access  Private (Admin)
 */
export const getRequestDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const request = await WebsiteRequest.findById(id).lean();
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    // Check if website already created for this request
    const website = await Website.findOne({ requestId: id }).lean();
    
    res.status(200).json({
      success: true,
      data: {
        request,
        website,
      },
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request details',
    });
  }
};

/**
 * @desc    Update request status
 * @route   PATCH /api/admin/requests/:id/status
 * @access  Private (Admin)
 */
export const updateRequestStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, internalNotes } = req.body;
    
    if (!status || !Object.values(RequestStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Valid status is required',
      });
      return;
    }
    
    const request = await WebsiteRequest.findById(id);
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    // Update status
    request.status = status;
    
    if (internalNotes) {
      request.internalNotes = internalNotes;
    }
    
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Request status updated',
      data: request,
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update request status',
    });
  }
};

/**
 * @desc    Add internal notes to request
 * @route   PATCH /api/admin/requests/:id/notes
 * @access  Private (Admin)
 */
export const addInternalNotes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { internalNotes } = req.body;
    
    if (!internalNotes) {
      res.status(400).json({
        success: false,
        error: 'Internal notes are required',
      });
      return;
    }
    
    const request = await WebsiteRequest.findByIdAndUpdate(
      id,
      { internalNotes },
      { new: true, runValidators: true }
    );
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Notes added successfully',
      data: request,
    });
  } catch (error) {
    console.error('Error adding internal notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add notes',
    });
  }
};

/**
 * @desc    Approve request and create website
 * @route   POST /api/admin/requests/:id/approve
 * @access  Private (Admin)
 */
export const approveRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedAdmin, initialNotes } = req.body;
    
    // Find the request
    const request = await WebsiteRequest.findById(id);
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    // Validate request can be approved
    if (request.status === RequestStatus.APPROVED) {
      res.status(400).json({
        success: false,
        error: 'Request already approved',
      });
      return;
    }
    
    if (request.status === RequestStatus.REJECTED) {
      res.status(400).json({
        success: false,
        error: 'Cannot approve rejected request',
      });
      return;
    }
    
    // Check if website already exists
    const existingWebsite = await Website.findOne({ requestId: id });
    
    if (existingWebsite) {
      res.status(400).json({
        success: false,
        error: 'Website already created for this request',
      });
      return;
    }
    
    // Create website
    const website = await Website.create({
      userId: request.userId,
      requestId: request._id,
      name: request.projectName,
      description: request.description,
      projectType: request.projectType,
      status: WebsiteStatus.CREATED,
      assignedAdmin: assignedAdmin || undefined,
      totalPages: request.pagesRequired || undefined,
      adminNotes: initialNotes || undefined,
      startedAt: new Date(),
    });
    
    // Update request status
    request.status = RequestStatus.APPROVED;
    await request.save();
    
    // Send approval email to client
    Promise.resolve(sendClientApprovalEmail(request, website)).catch(error => {
      console.error('Failed to send approval email:', error);
    });
    
    res.status(201).json({
      success: true,
      message: 'Request approved and website created',
      data: {
        request,
        website,
      },
    });
  } catch (error: any) {
    console.error('Error approving request:', error);
    
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
      error: 'Failed to approve request',
    });
  }
};

/**
 * @desc    Reject request
 * @route   POST /api/admin/requests/:id/reject
 * @access  Private (Admin)
 */
export const rejectRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
      });
      return;
    }
    
    const request = await WebsiteRequest.findById(id);
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    if (request.status === RequestStatus.APPROVED) {
      res.status(400).json({
        success: false,
        error: 'Cannot reject approved request',
      });
      return;
    }
    
    // Update request
    request.status = RequestStatus.REJECTED;
    request.internalNotes = reason;
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Request rejected',
      data: request,
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject request',
    });
  }
};

/**
 * @desc    Get request statistics
 * @route   GET /api/admin/requests/stats
 * @access  Private (Admin)
 */
export const getRequestStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await WebsiteRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const formattedStats = Object.values(RequestStatus).reduce((acc, status) => {
      const stat = stats.find(s => s._id === status);
      acc[status] = stat ? stat.count : 0;
      return acc;
    }, {} as Record<string, number>);
    
    const total = await WebsiteRequest.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: formattedStats,
      },
    });
  } catch (error) {
    console.error('Error fetching request stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
};