// models/WebsiteRequest.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum RequestStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  CONTACTED = 'CONTACTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProjectType {
  BUSINESS = 'BUSINESS',
  ECOMMERCE = 'ECOMMERCE',
  PORTFOLIO = 'PORTFOLIO',
  BLOG = 'BLOG',
  LANDING_PAGE = 'LANDING_PAGE',
  OTHER = 'OTHER',
}

export interface IWebsiteRequest extends Document {
  userId: string;
  
  // Core project details
  projectName: string;
  description: string;
  projectType: ProjectType;
  
  // Contact information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  
  // Additional details
  pagesRequired?: number;
  features: string[];
  referenceLinks: string[];
  recommendedTemplate?: string;
  selectedPlan?: string;
  
  // Status management
  status: RequestStatus;
  editableUntil: Date;
  
  // Admin notes
  internalNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const websiteRequestSchema = new Schema<IWebsiteRequest>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    projectType: {
      type: String,
      enum: Object.values(ProjectType),
      required: [true, 'Project type is required'],
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    pagesRequired: {
      type: Number,
      min: [1, 'At least 1 page is required'],
      max: [100, 'Cannot exceed 100 pages'],
      required: true, // Optional field
    },
    features: {
      type: [String],
      default: [],
      required: false, // Optional field - user can leave blank
    },
    referenceLinks: {
      type: [String],
      default: [],
      required: false, // Optional field - user can leave blank
      validate: {
        validator: function(links: string[]) {
          // Only validate if links are provided
          if (!links || links.length === 0) return true;
          return links.every(link => /^https?:\/\/.+/.test(link));
        },
        message: 'All reference links must be valid URLs',
      },
    },
    recommendedTemplate: {
      type: String,
      trim: true,
      required: false, // Optional field - user can leave blank
    },
    selectedPlan: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
    },
    editableUntil: {
      type: Date,
      required: true,
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Internal notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
websiteRequestSchema.index({ userId: 1, createdAt: -1 });
websiteRequestSchema.index({ status: 1 });
websiteRequestSchema.index({ editableUntil: 1 });

// Virtual to check if request is still editable
websiteRequestSchema.virtual('isEditable').get(function() {
  return this.status === RequestStatus.PENDING && new Date() < this.editableUntil;
});

// Ensure virtuals are included in JSON
websiteRequestSchema.set('toJSON', { virtuals: true });
websiteRequestSchema.set('toObject', { virtuals: true });

const WebsiteRequest = mongoose.model<IWebsiteRequest>('WebsiteRequest', websiteRequestSchema);

export default WebsiteRequest;