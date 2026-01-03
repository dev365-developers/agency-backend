// controllers/admin.support.controller.ts
import { Request, Response } from 'express';
import SupportRequest, { SupportStatus, SupportPriority } from '../models/SupportRequest';
import Website from '../models/Website';
import WebsiteRequest from '../models/WebsiteRequest';
import { sendSupportResolvedEmail } from '../utils/emailService';

/**
 * @desc    Get all support requests
 * @route   GET /api/admin/support
 * @access  Private (Admin)
 */
export const getAllSupportRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      status,
      priority,
      category,
      assignedAdmin,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (category) {
      query.category = category;
    }

    if (assignedAdmin) {
      query.assignedAdmin = assignedAdmin;
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions: any = { [sortBy as string]: sortOrder };

    const [supportRequests, total] = await Promise.all([
      SupportRequest.find(query)
        .populate('website', 'name status deploymentUrl')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SupportRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: supportRequests.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: supportRequests,
    });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support requests',
    });
  }
};

/**
 * @desc    Get single support request with full details
 * @route   GET /api/admin/support/:id
 * @access  Private (Admin)
 */
export const getSupportRequestDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const supportRequest = await SupportRequest.findById(id)
      .populate('website')
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
    console.error('Error fetching support request details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support request details',
    });
  }
};

/**
 * @desc    Update support request status
 * @route   PATCH /api/admin/support/:id/status
 * @access  Private (Admin)
 */
export const updateSupportRequestStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, internalNotes } = req.body;

    if (!status || !Object.values(SupportStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Valid status is required',
      });
      return;
    }

    const supportRequest = await SupportRequest.findById(id);

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: 'Support request not found',
      });
      return;
    }

    const previousStatus = supportRequest.status;

    // Update status
    supportRequest.status = status;

    // Add internal notes if provided
    if (internalNotes) {
      supportRequest.internalNotes = supportRequest.internalNotes
        ? `${supportRequest.internalNotes}\n\n[${new Date().toISOString()}]\n${internalNotes}`
        : internalNotes;
    }

    await supportRequest.save();

    // Send email if status changed to RESOLVED
    if (status === SupportStatus.RESOLVED && previousStatus !== SupportStatus.RESOLVED) {
      try {
        const website = await Website.findById(supportRequest.websiteId);
        const websiteRequest = website 
          ? await WebsiteRequest.findById(website.requestId) 
          : null;

        if (website && websiteRequest) {
          await sendSupportResolvedEmail(supportRequest, website, websiteRequest);
        }
      } catch (emailError) {
        console.error('Failed to send resolved email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Support request status updated',
      data: supportRequest,
    });
  } catch (error) {
    console.error('Error updating support request status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update support request status',
    });
  }
};

/**
 * @desc    Update support request (bulk update)
 * @route   PATCH /api/admin/support/:id
 * @access  Private (Admin)
 */
export const updateSupportRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Fields that can be updated
    const allowedFields = [
      'status',
      'priority',
      'assignedAdmin',
      'internalNotes',
    ];

    // Filter update data
    const filteredData: any = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
      return;
    }

    const supportRequest = await SupportRequest.findByIdAndUpdate(
      id,
      { $set: filteredData },
      { new: true, runValidators: true }
    ).populate('website');

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: 'Support request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Support request updated successfully',
      data: supportRequest,
    });
  } catch (error: any) {
    console.error('Error updating support request:', error);

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
      error: 'Failed to update support request',
    });
  }
};

/**
 * @desc    Add internal notes to support request
 * @route   PATCH /api/admin/support/:id/notes
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

    const supportRequest = await SupportRequest.findById(id);

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: 'Support request not found',
      });
      return;
    }

    // Append notes with timestamp
    supportRequest.internalNotes = supportRequest.internalNotes
      ? `${supportRequest.internalNotes}\n\n[${new Date().toISOString()}]\n${internalNotes}`
      : internalNotes;

    await supportRequest.save();

    res.status(200).json({
      success: true,
      message: 'Internal notes added',
      data: supportRequest,
    });
  } catch (error) {
    console.error('Error adding internal notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add internal notes',
    });
  }
};

/**
 * @desc    Assign admin to support request
 * @route   PATCH /api/admin/support/:id/assign
 * @access  Private (Admin)
 */
export const assignAdminToSupport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedAdmin } = req.body;

    if (!assignedAdmin) {
      res.status(400).json({
        success: false,
        error: 'Admin name is required',
      });
      return;
    }

    const supportRequest = await SupportRequest.findByIdAndUpdate(
      id,
      { assignedAdmin },
      { new: true }
    );

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: 'Support request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Admin assigned successfully',
      data: supportRequest,
    });
  } catch (error) {
    console.error('Error assigning admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign admin',
    });
  }
};

/**
 * @desc    Set priority for support request
 * @route   PATCH /api/admin/support/:id/priority
 * @access  Private (Admin)
 */
export const setSupportPriority = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!priority || !Object.values(SupportPriority).includes(priority)) {
      res.status(400).json({
        success: false,
        error: 'Valid priority is required (LOW, MEDIUM, HIGH)',
      });
      return;
    }

    const supportRequest = await SupportRequest.findByIdAndUpdate(
      id,
      { priority },
      { new: true }
    );

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: 'Support request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Priority updated successfully',
      data: supportRequest,
    });
  } catch (error) {
    console.error('Error setting priority:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set priority',
    });
  }
};

/**
 * @desc    Get support request statistics
 * @route   GET /api/admin/support/stats
 * @access  Private (Admin)
 */
export const getSupportStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [statusStats, categoryStats, priorityStats, adminStats, total] = await Promise.all([
      SupportRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      SupportRequest.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]),
      SupportRequest.aggregate([
        {
          $match: { priority: { $ne: null } },
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },
      ]),
      SupportRequest.aggregate([
        {
          $match: { assignedAdmin: { $ne: null } },
        },
        {
          $group: {
            _id: '$assignedAdmin',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),
      SupportRequest.countDocuments(),
    ]);

    const formattedStatusStats = Object.values(SupportStatus).reduce((acc, status) => {
      const stat = statusStats.find(s => s._id === status);
      acc[status] = stat ? stat.count : 0;
      return acc;
    }, {} as Record<string, number>);

    const formattedCategoryStats = categoryStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    const formattedPriorityStats = Object.values(SupportPriority).reduce((acc, priority) => {
      const stat = priorityStats.find(s => s._id === priority);
      acc[priority] = stat ? stat.count : 0;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: formattedStatusStats,
        byCategory: formattedCategoryStats,
        byPriority: formattedPriorityStats,
        byAdmin: adminStats,
      },
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support statistics',
    });
  }
};