// models/Website.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum WebsiteStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  DEPLOYED = 'DEPLOYED',
  CANCELLED = 'CANCELLED',
}

export enum BillingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  SUSPENDED = 'SUSPENDED',
}

export interface IBilling {
  status: BillingStatus;
  plan?: string;
  price?: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  activatedAt?: Date;
  dueAt?: Date;
  lastPaymentAt?: Date;
  graceEndsAt?: Date;
  suspendedAt?: Date;
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    method?: string;
    transactionId?: string;
  }>;
}

export interface IWebsite extends Document {
  userId: string;
  requestId: mongoose.Types.ObjectId;
  
  // Basic info
  name: string;
  description?: string;
  projectType: string;
  
  // Status tracking
  status: WebsiteStatus;
  assignedAdmin?: string;
  
  // Technical details
  domain?: string;
  deploymentUrl?: string;
  repositoryUrl?: string;
  
  // Project details
  pagesCompleted?: number;
  totalPages?: number;
  completionPercentage?: number;
  
  // Admin notes
  adminNotes?: string;
  clientNotes?: string;
  
  // Milestones
  milestones?: Array<{
    title: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  
  // Billing information
  billing: IBilling;
  
  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  deployedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const billingSchema = new Schema<IBilling>({
  status: {
    type: String,
    enum: Object.values(BillingStatus),
    default: BillingStatus.PENDING,
    required: true,
  },
  plan: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    min: 0,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly',
  },
  activatedAt: Date,
  dueAt: Date,
  lastPaymentAt: Date,
  graceEndsAt: Date,
  suspendedAt: Date,
  paymentHistory: [
    {
      amount: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },
      method: String,
      transactionId: String,
    },
  ],
}, { _id: false });

const websiteSchema = new Schema<IWebsite>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'WebsiteRequest',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Website name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    projectType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WebsiteStatus),
      default: WebsiteStatus.CREATED,
      required: true,
    },
    assignedAdmin: {
      type: String,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    deploymentUrl: {
      type: String,
      trim: true,
    },
    repositoryUrl: {
      type: String,
      trim: true,
    },
    pagesCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalPages: {
      type: Number,
      min: 0,
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Admin notes cannot exceed 5000 characters'],
    },
    clientNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Client notes cannot exceed 2000 characters'],
    },
    milestones: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
      },
    ],
    billing: {
      type: billingSchema,
      required: true,
      default: () => ({
        status: BillingStatus.PENDING,
        billingCycle: 'monthly',
      }),
    },
    startedAt: Date,
    completedAt: Date,
    deployedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
websiteSchema.index({ userId: 1, status: 1 });
websiteSchema.index({ assignedAdmin: 1 });
websiteSchema.index({ status: 1, createdAt: -1 });
websiteSchema.index({ 'billing.status': 1 });
websiteSchema.index({ 'billing.dueAt': 1 });
websiteSchema.index({ 'billing.graceEndsAt': 1 });

// Update completion percentage before saving
websiteSchema.pre('save', function(next) {
  if (this.totalPages && this.pagesCompleted !== undefined) {
    this.completionPercentage = Math.round(
      (this.pagesCompleted / this.totalPages) * 100
    );
  }
  next();
});

// Virtual to get full request details
websiteSchema.virtual('request', {
  ref: 'WebsiteRequest',
  localField: 'requestId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included
websiteSchema.set('toJSON', { virtuals: true });
websiteSchema.set('toObject', { virtuals: true });

const Website = mongoose.model<IWebsite>('Website', websiteSchema);

export default Website;