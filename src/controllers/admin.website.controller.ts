// controllers/admin.website.controller.ts
import { Request, Response } from 'express';
import Website, { WebsiteStatus, BillingStatus } from '../models/Website';
import WebsiteRequest from '../models/WebsiteRequest';
import { initializeBilling } from '../utils/billingUtils';
import { sendBillingActivatedEmail } from '../utils/emailService';

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
      billingStatus,
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
    
    if (billingStatus) {
      query['billing.status'] = billingStatus;
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
    
    // Get current website to check status change
    const currentWebsite = await Website.findById(id);
    if (!currentWebsite) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }

    // Handle status change timestamps
    if (filteredData.status) {
      if (filteredData.status === WebsiteStatus.IN_PROGRESS && !currentWebsite.startedAt) {
        filteredData.startedAt = new Date();
      }
      if (filteredData.status === WebsiteStatus.COMPLETED) {
        filteredData.completedAt = new Date();
      }
      if (filteredData.status === WebsiteStatus.DEPLOYED) {
        filteredData.deployedAt = new Date();
        
        // 🔥 PHASE 2: Initialize billing when deployed
        if (currentWebsite.status !== WebsiteStatus.DEPLOYED) {
          // Convert plan to lowercase if provided
          const billingPlan = updateData.billingPlan 
            ? updateData.billingPlan.toLowerCase().trim() 
            : undefined;
          
          const billingData = initializeBilling(
            billingPlan,
            updateData.billingPrice,
            updateData.billingCycle || 'monthly'
          );
          
          // Update billing fields individually
          filteredData['billing.status'] = billingData.status;
          filteredData['billing.plan'] = billingData.plan;
          filteredData['billing.price'] = billingData.price;
          filteredData['billing.billingCycle'] = billingData.billingCycle;
          filteredData['billing.activatedAt'] = billingData.activatedAt;
          filteredData['billing.dueAt'] = billingData.dueAt;
          filteredData['billing.graceEndsAt'] = billingData.graceEndsAt;
          
          console.log(`✅ Billing initialized for website ${id}:`, billingData);
        }
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

    // Send billing activation email if status changed to DEPLOYED
    if (filteredData.status === WebsiteStatus.DEPLOYED && 
        currentWebsite.status !== WebsiteStatus.DEPLOYED) {
      try {
        const request = await WebsiteRequest.findById(website.requestId);
        if (request) {
          await sendBillingActivatedEmail(request, website);
        }
      } catch (emailError) {
        console.error('Failed to send billing activation email:', emailError);
        // Don't fail the request if email fails
      }
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
    
    const previousStatus = website.status;
    
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
      
      // 🔥 PHASE 2: Initialize billing when deployed
      if (previousStatus !== WebsiteStatus.DEPLOYED) {
        const billingData = initializeBilling();
        
        // Update billing fields
        website.billing.status = billingData.status!;
        website.billing.plan = billingData.plan;
        website.billing.price = billingData.price;
        website.billing.billingCycle = billingData.billingCycle!;
        website.billing.activatedAt = billingData.activatedAt;
        website.billing.dueAt = billingData.dueAt;
        website.billing.graceEndsAt = billingData.graceEndsAt;
        
        console.log(`✅ Billing initialized for website ${id}:`, billingData);
      }
    }
    
    // Add notes if provided
    if (notes) {
      website.adminNotes = website.adminNotes 
        ? `${website.adminNotes}\n\n[${new Date().toISOString()}]\n${notes}`
        : notes;
    }
    
    await website.save();

    // Send billing activation email if status changed to DEPLOYED
    if (status === WebsiteStatus.DEPLOYED && previousStatus !== WebsiteStatus.DEPLOYED) {
      try {
        const request = await WebsiteRequest.findById(website.requestId);
        if (request) {
          await sendBillingActivatedEmail(request, website);
        }
      } catch (emailError) {
        console.error('Failed to send billing activation email:', emailError);
      }
    }
    
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
 * @desc    Update billing information
 * @route   PATCH /api/admin/websites/:id/billing
 * @access  Private (Admin)
 */
export const updateBilling = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { plan, price, billingCycle, status } = req.body;
    
    const website = await Website.findById(id);
    
    if (!website) {
      res.status(404).json({
        success: false,
        error: 'Website not found',
      });
      return;
    }
    
    // Update billing fields with lowercase conversion for plan
    if (plan !== undefined) {
      website.billing.plan = typeof plan === 'string' 
        ? plan.toLowerCase().trim() 
        : plan;
    }
    if (price !== undefined) website.billing.price = price;
    if (billingCycle !== undefined) website.billing.billingCycle = billingCycle;
    if (status !== undefined && Object.values(BillingStatus).includes(status)) {
      website.billing.status = status;
    }
    
    await website.save();
    
    res.status(200).json({
      success: true,
      message: 'Billing updated successfully',
      data: website,
    });
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update billing',
    });
  }
};

/**
 * @desc    Record payment for website
 * @route   POST /api/admin/websites/:id/payment
 * @access  Private (Admin)
 */
export const recordPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, method, transactionId } = req.body;
    
    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Valid payment amount is required',
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
    
    const now = new Date();
    
    // Add payment to history
    if (!website.billing.paymentHistory) {
      website.billing.paymentHistory = [];
    }
    
    website.billing.paymentHistory.push({
      amount,
      date: now,
      method,
      transactionId,
    });
    
    // Update billing status to ACTIVE
    website.billing.status = BillingStatus.ACTIVE;
    website.billing.lastPaymentAt = now;
    
    // Calculate next due date
    const { calculateNextDueDate } = require('../utils/billingUtils');
    website.billing.dueAt = calculateNextDueDate(now, website.billing.billingCycle);
    
    await website.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: website,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record payment',
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
    const [statusStats, billingStats, adminStats, total] = await Promise.all([
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
          $group: {
            _id: '$billing.status',
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

    const formattedBillingStats = Object.values(BillingStatus).reduce((acc, status) => {
      const stat = billingStats.find(s => s._id === status);
      acc[status] = stat ? stat.count : 0;
      return acc;
    }, {} as Record<string, number>);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: formattedStatusStats,
        byBillingStatus: formattedBillingStats,
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