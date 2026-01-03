import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types';
import Website from '../models/Website';

export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.auth!;
    const { firstName, lastName } = req.body;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-__v');

    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-__v');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
};

export const getUserWebsites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const websites = await Website.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v -adminNotes -repositoryUrl -milestones')
      .lean();

    res.json({
      success: true,
      count: websites.length,
      data: websites,
    });
  } catch (error: any) {
    console.error('Get user websites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch websites',
    });
  }
};

export const getUserWebsitesByPlan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { plan } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Plan query parameter is required',
      });
    }

    const websites = await Website.find({ 
      userId,
      'billing.plan': plan.toLowerCase()
    })
      .sort({ createdAt: -1 })
      .select('-__v -adminNotes -repositoryUrl -milestones')
      .lean();

    res.json({
      success: true,
      count: websites.length,
      plan: plan.toLowerCase(),
      data: websites,
    });
  } catch (error: any) {
    console.error('Get user websites by plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch websites by plan',
    });
  }
};

export const getUserWebsiteById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const website = await Website.findOne({ _id: id, userId })
      .select('-__v -adminNotes -repositoryUrl -milestones')
      .lean();

    if (!website) {
      return res.status(404).json({
        success: false,
        error: 'Website not found',
      });
    }

    res.json({
      success: true,
      data: website,
    });
  } catch (error: any) {
    console.error('Get user website by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch website details',
    });
  }
};