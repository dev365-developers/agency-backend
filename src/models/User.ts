// models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  clerkId?: string;
  googleId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  authProvider: 'clerk' | 'google' | 'email';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      sparse: true, 
      index: true,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ['clerk', 'google', 'email'],
      default: 'email',
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index - at least one auth ID must exist
userSchema.index({ email: 1 });
userSchema.index({ clerkId: 1 }, { sparse: true });
userSchema.index({ googleId: 1 }, { sparse: true });

// Ensure at least one auth provider ID exists
userSchema.pre('save', function (next) {
  if (!this.clerkId && !this.googleId) {
    // For email/password users, we might not have either
    // This is fine as long as they have an email
    if (!this.email) {
      return next(new Error('User must have at least an email address'));
    }
  }
  next();
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;