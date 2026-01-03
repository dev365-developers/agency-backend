// models/SupportRequest.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum SupportCategory {
  BUG = 'BUG',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
  BILLING = 'BILLING',
  GENERAL = 'GENERAL',
}

export enum SupportStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum SupportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface ISupportRequest extends Document {
  userId: string;
  websiteId: mongoose.Types.ObjectId;
  
  // Request details
  category: SupportCategory;
  subject: string;
  message: string;
  
  // Status tracking
  status: SupportStatus;
  priority?: SupportPriority;
  
  // Admin handling
  internalNotes?: string;
  assignedAdmin?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const supportRequestSchema = new Schema<ISupportRequest>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(SupportCategory),
      required: [true, 'Category is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(SupportStatus),
      default: SupportStatus.OPEN,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(SupportPriority),
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Internal notes cannot exceed 5000 characters'],
    },
    assignedAdmin: {
      type: String,
      trim: true,
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
supportRequestSchema.index({ userId: 1, createdAt: -1 });
supportRequestSchema.index({ websiteId: 1 });
supportRequestSchema.index({ status: 1 });
supportRequestSchema.index({ category: 1 });
supportRequestSchema.index({ priority: 1 });
supportRequestSchema.index({ assignedAdmin: 1 });

// Compound index for preventing duplicate OPEN requests per category per website (optional)
supportRequestSchema.index(
  { userId: 1, websiteId: 1, category: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: SupportStatus.OPEN }
  }
);

// Update resolvedAt timestamp when status changes to RESOLVED
supportRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === SupportStatus.RESOLVED && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Virtual to populate website details
supportRequestSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included
supportRequestSchema.set('toJSON', { virtuals: true });
supportRequestSchema.set('toObject', { virtuals: true });

const SupportRequest = mongoose.model<ISupportRequest>('SupportRequest', supportRequestSchema);

export default SupportRequest;