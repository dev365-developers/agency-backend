// types/index.ts
import { Request } from 'express';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
}

export interface AdminRequest extends Request {
  admin?: {
    username: string;
    authenticatedAt: Date;
  };
}

export interface UserProfile {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  count?: number;
  total?: number;
  page?: number;
  pages?: number;
}

// Request DTOs
export interface CreateWebsiteRequestDTO {
  projectName: string;
  description: string;
  projectType: 'BUSINESS' | 'ECOMMERCE' | 'PORTFOLIO' | 'BLOG' | 'LANDING_PAGE' | 'OTHER';
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  pagesRequired?: number;
  features?: string[];
  referenceLinks?: string[];
  recommendedTemplate?: string;
  selectedPlan?: string;
}

export interface UpdateWebsiteRequestDTO {
  projectName?: string;
  description?: string;
  projectType?: 'BUSINESS' | 'ECOMMERCE' | 'PORTFOLIO' | 'BLOG' | 'LANDING_PAGE' | 'OTHER';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  pagesRequired?: number;
  features?: string[];
  referenceLinks?: string[];
  recommendedTemplate?: string;
  selectedPlan?: string;
}

// Admin DTOs
export interface UpdateRequestStatusDTO {
  status: 'PENDING' | 'IN_REVIEW' | 'CONTACTED' | 'APPROVED' | 'REJECTED';
  internalNotes?: string;
}

export interface ApproveRequestDTO {
  assignedAdmin?: string;
  initialNotes?: string;
}

export interface RejectRequestDTO {
  reason: string;
}

export interface UpdateWebsiteDTO {
  name?: string;
  description?: string;
  status?: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'DEPLOYED' | 'CANCELLED';
  assignedAdmin?: string;
  domain?: string;
  deploymentUrl?: string;
  repositoryUrl?: string;
  pagesCompleted?: number;
  totalPages?: number;
  adminNotes?: string;
  clientNotes?: string;
  milestones?: Array<{
    title: string;
    completed: boolean;
    completedAt?: Date;
  }>;
}

export interface UpdateWebsiteStatusDTO {
  status: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'DEPLOYED' | 'CANCELLED';
  notes?: string;
}

export interface AddMilestoneDTO {
  title: string;
  completed?: boolean;
}

export interface UpdateMilestoneDTO {
  title?: string;
  completed?: boolean;
}

export interface AssignAdminDTO {
  assignedAdmin: string;
}