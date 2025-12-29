// controllers/admin.user.controller.ts
import { Request, Response } from 'express';
import User from '../models/User';
import WebsiteRequest from '../models/WebsiteRequest';
import Website from '../models/Website';

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { 
      search, 
      authProvider,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;
    
    // Build query
    const query: any = {};
    
    if (authProvider) {
      query.authProvider = authProvider;
    }
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions: any = { [sortBy as string]: sortOrder };
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-__v')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);
    
    // Get request and website counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        // Use clerkId, googleId, or _id as userId in requests/websites
        const userId = user.clerkId || user.googleId || user._id.toString();
        
        const [requestCount, websiteCount] = await Promise.all([
          WebsiteRequest.countDocuments({ userId }),
          Website.countDocuments({ userId }),
        ]);
        
        return {
          ...user,
          requestCount,
          websiteCount,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: usersWithCounts,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
};

/**
 * @desc    Get single user with full details
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
export const getUserDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Try to find user by MongoDB _id, clerkId, or googleId
    let user = await User.findById(id).select('-__v').lean().catch(() => null);
    
    if (!user) {
      user = await User.findOne({
        $or: [
          { clerkId: id },
          { googleId: id }
        ]
      }).select('-__v').lean();
    }
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    // Use the appropriate userId for querying requests/websites
    const userId = user.clerkId || user.googleId || user._id.toString();
    
    // Get user's requests and websites
    const [requests, websites, requestCount, websiteCount] = await Promise.all([
      WebsiteRequest.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Website.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      WebsiteRequest.countDocuments({ userId }),
      Website.countDocuments({ userId }),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          requestCount,
          websiteCount,
        },
        recentRequests: requests,
        recentWebsites: websites,
      },
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details',
    });
  }
};

/**
 * @desc    Update user information
 * @route   PATCH /api/admin/users/:id
 * @access  Private (Admin)
 */
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Fields that can be updated by admin
    const allowedFields = [
      'email',
      'firstName',
      'lastName',
      'imageUrl',
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
    
    // Try to find and update by MongoDB _id first
    let user = await User.findByIdAndUpdate(
      id,
      { $set: filteredData },
      { new: true, runValidators: true }
    ).select('-__v').catch(() => null);
    
    // If not found by _id, try clerkId or googleId
    if (!user) {
      user = await User.findOneAndUpdate(
        {
          $or: [
            { clerkId: id },
            { googleId: id }
          ]
        },
        { $set: filteredData },
        { new: true, runValidators: true }
      ).select('-__v');
    }
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message,
      });
      return;
    }
    
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
};

/**
 * @desc    Get all requests for a specific user
 * @route   GET /api/admin/users/:id/requests
 * @access  Private (Admin)
 */
export const getUserRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      status, 
      projectType,
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Try to find user by MongoDB _id, clerkId, or googleId
    let user = await User.findById(id).catch(() => null);
    
    if (!user) {
      user = await User.findOne({
        $or: [
          { clerkId: id },
          { googleId: id }
        ]
      });
    }
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    // Use the appropriate userId for querying
    const userId = user.clerkId || user.googleId || user._id.toString();
    
    // Build query
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (projectType) {
      query.projectType = projectType;
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
    console.error('Error fetching user requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user requests',
    });
  }
};

/**
 * @desc    Get all websites for a specific user
 * @route   GET /api/admin/users/:id/websites
 * @access  Private (Admin)
 */
export const getUserWebsites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Try to find user by MongoDB _id, clerkId, or googleId
    let user = await User.findById(id).catch(() => null);
    
    if (!user) {
      user = await User.findOne({
        $or: [
          { clerkId: id },
          { googleId: id }
        ]
      });
    }
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    // Use the appropriate userId for querying
    const userId = user.clerkId || user.googleId || user._id.toString();
    
    // Build query
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const [websites, total] = await Promise.all([
      Website.find(query)
        .populate('request', 'projectName projectType')
        .sort({ createdAt: -1 })
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
    console.error('Error fetching user websites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user websites',
    });
  }
};

/**
 * @desc    Delete user (soft delete - mark as inactive)
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Try to find user by MongoDB _id first
    let user = await User.findById(id).catch(() => null);
    
    if (!user) {
      user = await User.findOne({
        $or: [
          { clerkId: id },
          { googleId: id }
        ]
      });
    }
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    // Use the appropriate userId for checking
    const userId = user.clerkId || user.googleId || user._id.toString();
    
    // Check if user has active projects
    const activeWebsites = await Website.countDocuments({
      userId,
      status: { $in: ['IN_PROGRESS', 'REVIEW'] },
    });
    
    if (activeWebsites > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete user with ${activeWebsites} active project(s)`,
      });
      return;
    }
    
    // Delete by MongoDB _id
    await User.findByIdAndDelete(user._id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/admin/users/stats
 * @access  Private (Admin)
 */
export const getUserStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [authProviderStats, total, recentUsers] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: '$authProvider',
            count: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments(),
      User.find()
        .select('email firstName lastName createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);
    
    const formattedAuthStats = authProviderStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        byAuthProvider: formattedAuthStats,
        recentUsers,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
    });
  }
};