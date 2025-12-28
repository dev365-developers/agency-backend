import { Response } from 'express';
import { clerkClient } from '../config/clerk';
import User from '../models/User';
import { AuthRequest } from '../types';

export const syncUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.auth!;

    // Get user data from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);

    if (!clerkUser) {
      res.status(404).json({
        success: false,
        error: 'User not found in Clerk',
      });
      return;
    }

    // Get primary email
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      res.status(400).json({
        success: false,
        error: 'No email found for user',
      });
      return;
    }

    // Create or update user in MongoDB
    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        clerkId: userId,
        email: primaryEmail.emailAddress,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
        imageUrl: clerkUser.imageUrl || undefined,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      data: {
        user: {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        },
      },
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync user',
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.auth!;

    // Delete user from MongoDB
    await User.findOneAndDelete({ clerkId: userId });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.auth!;

    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
};