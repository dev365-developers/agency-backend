// controllers/admin.website.controller.ts
import { Request, Response } from 'express';
import Website, { WebsiteStatus } from '../models/Website';
import WebsiteRequest from '../models/WebsiteRequest';

/**
 * @desc    Get all websites
 * @route   GET /api/admin/websites
 * @access  Private (Admin)
 */
export const getAllWebsites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { 
      status, 
      assignedAdmin, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;
    
    // Build query
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (assignedAdmin) {
      query.assignedAdmin = assignedAdmin;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions: any = { [sortBy as string]: sortOrder };
    
    const [websites, total] = await Promise.all([
      Website.find(query)
        .populate('request', 'projectName contactName contactEmail')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Website.countDocuments(query),
    ]);
    
    res.status(200).json({
      success: true,
      count: websites.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: websites,
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch websites',
    });
  }
};

/**
 * @desc    Get single website with full details
 * @route   GET /api/admin/websites/:id
 * @access  Private (Admin)
 */
export const getWebsiteDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const website = await Website.findById(id)
      .populate('request')
      .lean();
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error('Error fetching website details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch website details',
    });
  }
};

/**
 * @desc    Update website
 * @route   PATCH /api/admin/websites/:id
 * @access  Private (Admin)
 */
export const updateWebsite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Fields that can be updated
    const allowedFields = [
      'name',
      'description',
      'status',
      'assignedAdmin',
      'domain',
      'deploymentUrl',
      'repositoryUrl',
      'pagesCompleted',
      'totalPages',
      'adminNotes',
      'clientNotes',
      'milestones',
    ];
    
    // Filter update data
    const filteredData: any = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });
    
    // Handle status change timestamps
    if (filteredData.status) {
      if (filteredData.status === WebsiteStatus.IN_PROGRESS && !filteredData.startedAt) {
        filteredData.startedAt = new Date();
      }
      if (filteredData.status === WebsiteStatus.COMPLETED) {
        filteredData.completedAt = new Date();
      }
      if (filteredData.status === WebsiteStatus.DEPLOYED) {
        filteredData.deployedAt = new Date();
      }
    }
    
    const website = await Website.findByIdAndUpdate(
      id,
      { $set: filteredData },
      { new: true, runValidators: true }
    ).populate('request');
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Website updated successfully',
      data: website,
    });
  } catch (error: any) {
    console.error('Error updating website:', error);
    
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
      error: 'Failed to update website',
    });
  }
};

/**
 * @desc    Update website status
 * @route   PATCH /api/admin/websites/:id/status
 * @access  Private (Admin)
 */
export const updateWebsiteStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !Object.values(WebsiteStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Valid status is required',
      });
      return;
    }
    
    const website = await Website.findById(id);
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    // Update status
    website.status = status;
    
    // Update timestamps based on status
    if (status === WebsiteStatus.IN_PROGRESS && !website.startedAt) {
      website.startedAt = new Date();
    }
    if (status === WebsiteStatus.COMPLETED) {
      website.completedAt = new Date();
    }
    if (status === WebsiteStatus.DEPLOYED) {
      website.deployedAt = new Date();
    }
    
    // Add notes if provided
    if (notes) {
      website.adminNotes = website.adminNotes 
        ? `${website.adminNotes}\n\n[${new Date().toISOString()}]\n${notes}`
        : notes;
    }
    
    await website.save();
    
    res.status(200).json({
      success: true,
      message: 'Website status updated',
      data: website,
    });
  } catch (error) {
    console.error('Error updating website status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update website status',
    });
  }
};

/**
 * @desc    Add milestone to website
 * @route   POST /api/admin/websites/:id/milestones
 * @access  Private (Admin)
 */
export const addMilestone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, completed = false } = req.body;
    
    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Milestone title is required',
      });
      return;
    }
    
    const website = await Website.findById(id);
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    const milestone = {
      title,
      completed,
      completedAt: completed ? new Date() : undefined,
    };
    
    if (!website.milestones) {
      website.milestones = [];
    }
    
    website.milestones.push(milestone);
    await website.save();
    
    res.status(201).json({
      success: true,
      message: 'Milestone added',
      data: website,
    });
  } catch (error) {
    console.error('Error adding milestone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add milestone',
    });
  }
};

/**
 * @desc    Update milestone
 * @route   PATCH /api/admin/websites/:id/milestones/:milestoneIndex
 * @access  Private (Admin)
 */
export const updateMilestone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id, milestoneIndex } = req.params;
    const { title, completed } = req.body;
    
    const website = await Website.findById(id);
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    const index = parseInt(milestoneIndex);
    
    if (!website.milestones || index >= website.milestones.length) {
      res.status(404).json({
        success: false,
        error: 'Milestone not found',
      });
      return;
    }
    
    if (title !== undefined) {
      website.milestones[index].title = title;
    }
    
    if (completed !== undefined) {
      website.milestones[index].completed = completed;
      website.milestones[index].completedAt = completed ? new Date() : undefined;
    }
    
    await website.save();
    
    res.status(200).json({
      success: true,
      message: 'Milestone updated',
      data: website,
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update milestone',
    });
  }
};

/**
 * @desc    Assign admin to website
 * @route   PATCH /api/admin/websites/:id/assign
 * @access  Private (Admin)
 */
export const assignAdmin = async (
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
    
    const website = await Website.findByIdAndUpdate(
      id,
      { assignedAdmin },
      { new: true }
    );
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Admin assigned successfully',
      data: website,
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
 * @desc    Get website statistics
 * @route   GET /api/admin/websites/stats
 * @access  Private (Admin)
 */
export const getWebsiteStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [statusStats, adminStats, total] = await Promise.all([
      Website.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Website.aggregate([
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
      Website.countDocuments(),
    ]);
    
    const formattedStatusStats = Object.values(WebsiteStatus).reduce((acc, status) => {
      const stat = statusStats.find(s => s._id === status);
      acc[status] = stat ? stat.count : 0;
      return acc;
    }, {} as Record<string, number>);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: formattedStatusStats,
        byAdmin: adminStats,
      },
    });
  } catch (error) {
    console.error('Error fetching website stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
};