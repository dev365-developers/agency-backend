import { Router } from 'express';
import { 
  updateUserProfile, 
  getAllUsers, 
  getUserById, 
  getUserWebsites, 
  getUserWebsiteById,
  getUserWebsitesByPlan  // Add this import
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Update current user's profile
router.patch('/profile', updateUserProfile);

// Get user's websites filtered by plan
router.get('/websites/plan', getUserWebsitesByPlan);

// Get user's websites
router.get('/websites', getUserWebsites);

// Get single website details
router.get('/websites/:id', getUserWebsiteById);

// Get user by ID
router.get('/:id', getUserById);

export default router;