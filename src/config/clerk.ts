// config/clerk.ts
import dotenv from 'dotenv';
dotenv.config();
import { createClerkClient } from '@clerk/clerk-sdk-node';

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is not defined in environment variables');
}

export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export default clerkClient;