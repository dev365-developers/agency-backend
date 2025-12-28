import { Router } from 'express';
import { syncUser, deleteUser, getCurrentUser } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Sync user data from Clerk to MongoDB (call this after user signs in)
router.post('/sync', requireAuth, syncUser);

// Get current authenticated user
router.get('/me', requireAuth, getCurrentUser);

// Delete user (call this when user deletes account)
router.delete('/delete', requireAuth, deleteUser);

export default router;